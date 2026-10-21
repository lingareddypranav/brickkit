#!/usr/bin/env python3
"""Cache real LeoCAD picture instructions; no runtime API or model search needed.

OMR STEP/ROTSTEP order is retained, including nested assemblies. Models without
steps use explicit, reviewed groups of flattened brick placements below.
Run after prepare-omr.py. Requires LeoCAD, the LDraw library and Pillow.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

import numpy as np
from PIL import Image

FRONTEND = Path(__file__).resolve().parents[1]
IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1]
CURATED = {
    'green-dinosaur': {
        'groups': [[0], [31, 30, 32, 33], [1, 2], [3, 4, 5, 6],
                   [7, 11, 12, 13, 15], [8, 9, 10], [14, 16, 17],
                   [18, 19, 20, 21], [22, 23, 24, 27], [25, 26], [28, 29]],
        'titles': ['Start with the green plate', 'Turn it over. Add two feet',
                   'Build up the body', 'Add the green slopes', 'Build the shoulders',
                   'Add a swishy tail', 'Build the neck and mouth', 'Add four white teeth',
                   'Build the head', 'Add two eyes', 'Add the little arms. Roar!'],
    },
    'mini-shuttle': {},
    'shuttle-explorer': {
        # Source step 31 sits hidden under the finished tail; it starts the tail instead.
        'order': [*range(1, 29), 31, 29, 30, 32, 33],
        'stepTitles': {29: 'Start the tail. Add 2 white pieces'},
    },
    'space-transport': {
        # The astronaut is invisible under the closed canopy in source step 13.
        'order': [1, 2, 3, 4, 5, 6, 7, 8, 13, 9, 10, 11, 12],
        'stepTitles': {9: 'Build the astronaut. Sit them in the seat'},
    },
    'cute-pug': {
        'views': {13: [30, 135], 29: [30, 315]},
        'stepTitles': {13: 'Turn your pug around. Add the sloping piece',
                       14: 'Turn it back. Build the two back legs',
                       29: 'Turn your pug around. Add a grille tile',
                       30: 'Turn it back. Add 1 piece'},
    },
    'koala': {
        'views': {27: [30, 315], 28: [30, 315]},
        'stepTitles': {27: 'Turn your koala around. Add the last leg',
                       28: 'Add a black foot'},
    },
    'turkey': {
        'views': {13: [30, 225]},
        'stepTitles': {13: 'Turn your turkey around. Add a plate on the back',
                       14: 'Turn it back. Add 2 pieces'},
    },
    'mini-jet': {},
    'speedboat': {},
    'space-rover': {},
    'moon-base': {},
    'apatosaurus': {
        'groups': [[0], [25, 26, 27, 28], [29, 30, 31, 32], [2, 3, 6],
                   [4, 5, 1], [9, 10], [7, 8], [11, 12, 13], [17],
                   [14, 15, 16], [18, 19, 20], [21, 22, 23, 24]],
        'titles': ['Start with the grey body plate', 'Turn it over. Add four legs',
                   'Add four little claws', 'Turn it back. Start the body',
                   'Finish the body sides', 'Add the neck and tail joints',
                   'Put two slopes on the back', 'Build the long tail',
                   'Add the tip of the tail', 'Build the long neck',
                   'Start the little head', 'Finish your long-necked dinosaur'],
    },
    'pteranodon': {
        'groups': [[0, 1], [4, 5, 6], [2, 3], [7, 8, 9, 10], [11, 12],
                   [13], [14, 15], [16], [17, 18, 19, 20], [22, 21, 23],
                   [24, 25], [26, 27]],
        'titles': ['Start with two brown slopes', 'Join them with three hinge plates',
                   'Add two tan tail plates', 'Build the top of the body',
                   'Start the first wing', 'Add the first wing tip',
                   'Start the other wing', 'Add the other wing tip',
                   'Build the neck and beak', 'Build up the head',
                   'Add the tall crest', 'Add two eyes. Ready to soar!'],
    },
}


def split_models(text):
    blocks = re.split(r'(?m)^0 FILE ', text)
    if len(blocks) == 1:
        return {'main.ldr': text}, 'main.ldr'
    models = {b.splitlines()[0]: '\n'.join(b.splitlines()[1:]) for b in blocks[1:]}
    return models, next(iter(models))


def refs(text):
    return [line for line in text.splitlines() if line.startswith('1 ')]


def transform(line, position, matrix, inherited):
    fields = line.split(maxsplit=14)
    color = inherited if fields[1] == '16' else fields[1]
    v = list(map(float, fields[2:5]))
    b = list(map(float, fields[5:14]))
    p = [position[i] + sum(matrix[3*i+k]*v[k] for k in range(3)) for i in range(3)]
    m = [sum(matrix[3*i+k]*b[3*k+j] for k in range(3)) for i in range(3) for j in range(3)]
    return color, p, m, fields[14]


def placement(color, p, m, name):
    return '1 ' + str(color) + ' ' + ' '.join(f'{v:.8g}' for v in p+m) + ' ' + name


def timeline(models, name, p=None, m=None, color='7', stack=()):
    """Flatten model assemblies into world-space steps, never expand part .dat files."""
    if name in stack:
        raise ValueError(f'Cyclic submodel: {name}')
    p, m = p or [0, 0, 0], m or IDENTITY
    # LDraw file references are case-insensitive.
    names = {key.lower(): key for key in models}
    steps, pending = [], []
    for line in models[name].splitlines() + ['0 STEP']:
        if re.match(r'^0 (STEP|ROTSTEP)(\s|$)', line):
            if pending:
                steps.append(pending)
                pending = []
        elif line.startswith('1 '):
            c, cp, cm, child = transform(line, p, m, color)
            submodel = names.get(child.strip().lower())
            if submodel and submodel.lower().endswith('.ldr'):
                child_steps = timeline(models, submodel, cp, cm, c, stack+(name,))
                if len(child_steps) > 1:
                    if pending:
                        steps.append(pending)
                        pending = []
                    steps.extend(child_steps)
                else:
                    pending.extend(child_steps[0] if child_steps else [])
            else:
                pending.append(placement(c, cp, cm, child))
    return steps


def build_steps(models, root, spec):
    """Every guide must contain every source brick exactly once, in its pose.

    Flatten first so curated sequences can teach a subassembly brick by brick
    instead of asking a child to find an already assembled neck, head or wing.
    """
    target = spec.get('submodel', root)
    original_steps = timeline(models, target)
    original = [line for step in original_steps for line in step]
    if 'groups' in spec:
        indices = [i for group in spec['groups'] for i in group]
        if sorted(indices) != list(range(len(original))):
            raise ValueError(f'{root}: missing or repeated curated placement')
        if len(spec.get('titles', [])) != len(spec['groups']):
            raise ValueError(f'{root}: every curated step needs a title')
        steps = [[original[i] for i in group] for group in spec['groups']]
    elif 'order' in spec:
        if sorted(spec['order']) != list(range(1, len(original_steps)+1)):
            raise ValueError(f'{root}: reordered steps must use every source step once')
        steps = [original_steps[number-1] for number in spec['order']]
    else:
        steps = original_steps
    if len(steps) < 2 or not all(steps):
        raise ValueError(f'{root}: no usable construction order; curate this model first')
    if Counter(line for step in steps for line in step) != Counter(original):
        raise ValueError(f'{root}: guide does not reconstruct the complete source model')
    return steps


class Geometry:
    """Part bounding boxes from LDraw geometry, matching LeoCAD's piece bounds."""

    library = {}

    def __init__(self, ldraw, embedded):
        if ldraw not in Geometry.library:
            files = Geometry.library[ldraw] = {}
            for folder in ('parts', 'p', 'models'):
                base = ldraw/folder
                for path in base.rglob('*.dat'):
                    files.setdefault(str(path.relative_to(base)).lower(), path)
        self.files = Geometry.library[ldraw]
        self.embedded = {name.strip().replace('\\', '/').lower(): body for name, body in embedded.items()}
        self.cache = {}

    def bounds(self, name, stack=()):
        key = name.strip().replace('\\', '/').lower()
        if key in self.cache:
            return self.cache[key]
        if key in stack:
            raise ValueError(f'Cyclic part reference: {name}')
        if key in self.embedded:
            text = self.embedded[key]
        elif key in self.files:
            text = self.files[key].read_text(errors='replace')
        else:
            raise ValueError(f'Part not found for framing: {name}')
        points = []
        for line in text.splitlines():
            fields = line.split()
            if not fields or fields[0] not in '12345':
                continue
            if fields[0] == '1':
                child = self.bounds(' '.join(line.split(maxsplit=14)[14:]), stack+(key,))
                if child is not None:
                    points.append(corners(child, *map(float, fields[2:14])))
            else:
                count = {'2': 2, '3': 3, '4': 4, '5': 2}[fields[0]]
                points.append(np.array(fields[2:2+3*count], float).reshape(count, 3))
        result = None
        if points:
            stacked = np.vstack(points)
            result = stacked.min(axis=0), stacked.max(axis=0)
        self.cache[key] = result
        return result

    def points(self, placements):
        result = []
        for line in placements:
            fields = line.split(maxsplit=14)
            box = self.bounds(fields[14])
            if box is not None:
                result.append(corners(box, *map(float, fields[2:14])))
        return np.vstack(result)


def corners(box, *transform):
    lo, hi = box
    box_corners = np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1]) for z in (lo[2], hi[2])])
    return box_corners @ np.array(transform[3:]).reshape(3, 3).T + np.array(transform[:3])


def fitted_camera(points, angles):
    """Explicit orthographic camera that keeps every final brick inside the canvas.

    LeoCAD 25.09's automatic zoom for batch step exports can clip tall or long
    models. Mirror lcCamera::SetAngles, then frame the projected final-model
    bounds with a margin. Ortho height is fov (radians) * eye-target distance.
    """
    world = points[:, [0, 2, 1]] * [1, 1, -1]  # LDraw -> LeoCAD axes
    latitude, longitude = np.radians(angles)
    s, c = np.sin(longitude), np.cos(longitude)
    rotation_z = np.array([[c, s, 0], [-s, c, 0], [0, 0, 1]])
    side = np.array([-1, 0, 0]) @ rotation_z
    s, c = np.sin(latitude), np.cos(latitude)
    x, y, z = side
    rotation_lat = np.array([
        [(1-c)*x*x+c, (1-c)*x*y+z*s, (1-c)*z*x-y*s],
        [(1-c)*x*y-z*s, (1-c)*y*y+c, (1-c)*y*z+x*s],
        [(1-c)*z*x+y*s, (1-c)*y*z-x*s, (1-c)*z*z+c]])
    back = np.array([0, -1, 0]) @ rotation_z @ rotation_lat
    up = np.array([0, 0, 1]) @ rotation_lat
    right = np.cross(up, back)
    right /= np.linalg.norm(right)
    up = np.cross(back, right)
    projected = world @ np.array([right, up, back]).T
    lo, hi = projected.min(axis=0), projected.max(axis=0)
    middle = (lo+hi)/2
    height = max(hi[1]-lo[1], (hi[0]-lo[0])/RENDER_ASPECT) * FRAME_MARGIN
    distance = max(height/np.radians(30), (hi[2]-lo[2])/2 + 200)
    target = right*middle[0] + up*middle[1] + back*middle[2]
    eye = target + back*distance
    return {'position': [*eye, *target, *up], 'fov': float(np.degrees(height/distance))}


RENDER_ASPECT = 6400/5120
FRAME_MARGIN = 1.08
FRAMING = 'fitted-final-bounds-v1'


def run_render(args, model, output, camera, first=None, last=None, highlight=False, large=False):
    # Step diagrams are cropped and shown large. Render them well above display
    # size so edges stay smooth. Piece thumbnails stay small.
    # Same outlined mode as the catalogue previews. Line width scales with the
    # canvas so the strokes stay the same weight, and the large canvas keeps
    # them from looking jagged when the step is shown big.
    width, height = (6400, 5120) if large else (1000, 800)
    if isinstance(camera, dict):
        view = ['--camera-position', *(f'{v:.6f}' for v in camera['position']),
                '--fov', f"{camera['fov']:.6f}"]
    else:
        view = ['--camera-angles', *map(str, camera)]
    command = [args.leocad, '-l', str(args.ldraw), str(model), '-i', str(output),
               '-w', str(width), '-h', str(height), '--orthographic', *view,
               '--aa-samples', '8' if large else '4',
               '--line-width', '4.5' if large else '0.7']
    if first is not None:
        command += ['-f', str(first), '-t', str(last)]
    if highlight:
        command += ['--fade-steps', '--fade-steps-color', '#FFB8C3D1',
                    '--highlight', '--highlight-color', '#FF2563EB']
    result = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                            text=True, timeout=1200 if large else 180)
    # macOS emits a restorable-window warning for every CLI render. Preserve
    # useful diagnostics (missing parts, OpenGL failures) without that noise.
    diagnostics = '\n'.join(line for line in result.stderr.splitlines()
                            if 'Secure coding is not enabled for restorable state' not in line)
    if diagnostics:
        print(diagnostics, file=sys.stderr, flush=True)
    if result.returncode:
        raise RuntimeError(f'LeoCAD failed ({result.returncode}): {model.name}')


def optimize(path):
    with Image.open(path) as img:
        img = img.convert('RGBA')
        box = img.getbbox()
        if box:
            pad = 12
            x0, y0, x1, y1 = box
            img = img.crop((max(0, x0-pad), max(0, y0-pad),
                            min(img.width, x1+pad), min(img.height, y1+pad)))
        img.save(path, optimize=True)


def embedded_part(models, name):
    key = name.strip().replace('\\', '/').lower()
    return next((body for file, body in models.items()
                 if file.strip().replace('\\', '/').lower() == key and key.endswith('.dat')), None)


def part_label(library, name, models=None):
    """Follow LDraw rename aliases; catalogue maintenance notes are not kid-facing names."""
    body = embedded_part(models or {}, name)
    if body is not None:
        # OMR copies of official parts keep the official part number on the first line.
        header = body.splitlines()[0].removeprefix('0 ').strip() if body.strip() else ''
        if (library/'parts'/(header+'.dat')).is_file():
            name = header+'.dat'
        elif header:
            return re.sub(r'\s+', ' ', header.lstrip('~=')).strip()
    part_file = library/'parts'/name.replace('\\', '/')
    seen = set()
    label = 'LEGO piece'
    while part_file.is_file() and part_file not in seen:
        seen.add(part_file)
        label = part_file.read_text(errors='replace').splitlines()[0].removeprefix('0 ').strip()
        alias = re.fullmatch(r'~Moved to (\S+)', label)
        if not alias:
            break
        part_file = library/'parts'/(alias[1]+'.dat')
    if label.startswith('~Moved to '):
        label = 'LEGO piece'
    return re.sub(r'\s+', ' ', label.lstrip('~=').replace('(Obsolete)', '')).strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ldraw', required=True, type=Path)
    parser.add_argument('--leocad', default='/Applications/LeoCAD.app/Contents/MacOS/LeoCAD')
    parser.add_argument('--models', nargs='*', choices=list(CURATED), default=list(CURATED))
    parser.add_argument('--force', action='store_true', help='Render again even when source steps are unchanged')
    args = parser.parse_args()
    catalog = json.loads((FRONTEND/'lib/demo/catalog-data.json').read_text())
    manifests = {m['id']: m for m in json.loads((FRONTEND/'scripts/omr-models.json').read_text())}
    # Keep LDraw colour IDs, independent of Rebrickable inventory colour IDs.
    colors = {m[1]: m[0].replace('_', ' ') for m in re.findall(
        r'0 !COLOUR (\S+)\s+CODE\s+(\d+)\s+VALUE\s+(#[A-Fa-f0-9]+)',
        (args.ldraw/'LDConfig.ldr').read_text())}
    index_path = FRONTEND/'lib/demo/instructions-data.json'
    index = json.loads(index_path.read_text()) if index_path.exists() else {}
    part_dir = FRONTEND/'public/demo/instructions/parts'
    part_dir.mkdir(parents=True, exist_ok=True)
    for model in catalog['models']:
        model_id = model['id']
        if model_id not in args.models:
            continue
        spec, manifest = CURATED[model_id], manifests[model_id]
        source = FRONTEND/'public'/model['modelUrl'].lstrip('/')
        text = source.read_text()
        models, root = split_models(text)
        target = spec.get('submodel', root)
        steps = build_steps(models, root, spec)
        out = FRONTEND/'public/demo/instructions'/model_id
        out.mkdir(parents=True, exist_ok=True)
        # Preserve author/licence comments and all embedded part definitions.
        credits = '\n'.join(l for l in models[target].splitlines()
                            if l.startswith(('0 Author:', '0 !LICENSE', '0 !HISTORY')))
        prepared = '0 FILE picture-guide.ldr\n0 '+model['name']+' - picture guide\n'+credits+'\n'
        for i, step in enumerate(steps):
            prepared += '\n'.join(step)+'\n'
            if i+1 < len(steps):
                prepared += '0 STEP\n'
        prepared += ''.join('\n0 FILE '+name+'\n'+body+'\n' for name, body in models.items())
        guide_model = out/'guide.mpd'
        unchanged = guide_model.exists() and guide_model.read_text() == prepared
        images = sorted(out.glob('step[0-9]*.png'))
        guide_model.write_text(prepared)
        old_guide = index.get(model_id, {})
        camera = manifest['camera']
        views = {str(number): view for number, view in spec.get('views', {}).items()}
        if any(not 1 <= int(number) <= len(steps) for number in views):
            raise ValueError(f'{model_id}: camera override outside construction sequence')
        render_all = (args.force or not unchanged or len(images) != len(steps)
                      or old_guide.get('camera', camera) != camera
                      or old_guide.get('framing') != FRAMING)
        # Frame every step from the finished model so it never moves or clips.
        geometry = Geometry(args.ldraw, models)
        final_points = geometry.points([line for step in steps for line in step])
        rendered = set()
        if render_all:
            for stale in images:
                stale.unlink()
            run_render(args, guide_model, out/'step.png', fitted_camera(final_points, camera),
                       1, len(steps), True, large=True)
        images = sorted(out.glob('step[0-9]*.png'))
        assert len(images) == len(steps), (model_id, len(images), len(steps))
        if render_all:
            rendered.update(images)
        old_views = old_guide.get('stepViews', {})
        for number in sorted(set(views) | set(old_views), key=int):
            if render_all or old_views.get(number) != views.get(number):
                img = images[int(number)-1]
                run_render(args, guide_model, img, fitted_camera(final_points, views.get(number, camera)),
                           int(number), int(number), True, large=True)
                rendered.add(img)
        guide = []
        for i, (step, img) in enumerate(zip(steps, images)):
            if img in rendered:
                optimize(img)
            pieces = []
            for (color, name), count in Counter((l.split(maxsplit=14)[1], l.split(maxsplit=14)[14]) for l in step).items():
                slug = re.sub(r'[^a-zA-Z0-9_-]', '-', name.removesuffix('.dat'))+'-'+color
                thumb = part_dir/(slug+'.png')
                label = part_label(args.ldraw, name, models)
                if not thumb.exists():
                    body = embedded_part(models, name)
                    official = body and body.splitlines()[0].removeprefix('0 ').strip()+'.dat'
                    if official and (args.ldraw/'parts'/official).is_file():
                        body = None
                    piece = placement(color, [0, 0, 0], IDENTITY, official if official and body is None else name)+'\n'
                    if body is None:
                        piece_model = part_dir/(slug+'.ldr')
                        piece_model.write_text('0 Piece preview\n'+piece)
                    else:
                        # Custom OMR part definitions live inside the source MPD.
                        piece_model = part_dir/(slug+'.mpd')
                        piece_model.write_text('0 FILE piece.ldr\n0 Piece preview\n'+piece+''.join(
                            '\n0 FILE '+file+'\n'+body+'\n' for file, body in models.items()
                            if file.strip().lower().endswith('.dat')))
                    run_render(args, piece_model, thumb, [30, 45])
                    piece_model.unlink()
                    with Image.open(thumb) as im:
                        im.thumbnail((160, 128))
                        im.save(thumb, optimize=True)
                pieces.append({'id': slug, 'name': label, 'color': colors.get(color, color),
                               'count': count, 'image': '/'+str(thumb.relative_to(FRONTEND/'public'))})
            title = (spec['titles'][i] if spec.get('titles') else
                     spec.get('stepTitles', {}).get(i+1,
                         f'Add {len(step)} '+('piece' if len(step)==1 else 'pieces')))
            guide.append({'title': title,
                          'image': '/'+str(img.relative_to(FRONTEND/'public')), 'pieces': pieces})
        index[model_id] = {'kind': 'pictures', 'sourceSha256': hashlib.sha256(text.encode('utf-8')).hexdigest(),
                           'sequence': 'curated' if 'groups' in spec or 'order' in spec else 'omr',
                           'camera': camera, 'framing': FRAMING, 'stepViews': views,
                           'modelUrl': '/'+str(guide_model.relative_to(FRONTEND/'public')),
                           'steps': guide}
        index_path.write_text(json.dumps(index, indent=2)+'\n')
        print(f'{model_id}: {len(steps)} picture steps cached', flush=True)


    credits = ['# Cached picture guide sources', '',
               'Derived from the OMR models credited below; original credits and licences are also retained in each guide.mpd.',
               'Step grouping for Green Dinosaur, Apatosaurus and Pteranodon was added by the Blueprint project. '
               'Space Transport and Shuttle Explorer each move one OMR step earlier so its pieces stay visible. '
               'Other guides retain the OMR construction order; some steps use a second camera angle to show pieces on the far side.',
               'Part previews are rendered with the LDraw Parts Library. See [LDraw attribution and licences](../omr/CAreadme.txt), [CCAL](../omr/CAlicense.txt) and [CC BY 4.0](../omr/CAlicense4.txt).', '']
    for model in catalog['models']:
        if (model['id'] in index and index[model['id']].get('kind') != 'booklet'
                and index[model['id']].get('sequence') != 'booklet'):
            source = model['source']
            credits += [f"## {model['name']}", '',
                        f"Model by {source['author']}. {source['license']}",
                        f"[Original OMR source]({source['url']})", '',
                        f"Cached source SHA-256: `{index[model['id']]['sourceSha256']}`", '']
    (FRONTEND/'public/demo/instructions/SOURCES.md').write_text('\n'.join(credits)+'\n')

    # Refresh booklets from the same diagrams and index, so PDFs cannot silently
    # retain an older step sequence after the model preparation command.
    subprocess.run([sys.executable, str(Path(__file__).with_name('prepare-instruction-pdfs.py')),
                    '--models', *args.models], check=True)


if __name__ == '__main__':
    main()
