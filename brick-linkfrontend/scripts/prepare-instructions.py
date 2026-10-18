#!/usr/bin/env python3
"""Cache real LeoCAD picture instructions; no runtime API or model search needed.

OMR STEP/ROTSTEP order is retained, including nested assemblies. The two
small models without steps use explicit, reviewed placement groups below.
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

from PIL import Image

FRONTEND = Path(__file__).resolve().parents[1]
IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1]
CURATED = {
    'dragon-friend': {
        'submodel': '6056 - Dragon.ldr',
        'groups': [[0], [1], [2], [3, 4], [5], [6], [7]],
        'titles': ['Find the dragon body', 'Click on the tail', 'Add the lower jaw',
                   'Give your dragon two arms', 'Add one red wing',
                   'Add the other red wing', 'Time for fire breath!'],
    },
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
    'space-transport': {},
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
    steps, pending = [], []
    for line in models[name].splitlines() + ['0 STEP']:
        if re.match(r'^0 (STEP|ROTSTEP)(\s|$)', line):
            if pending:
                steps.append(pending)
                pending = []
        elif line.startswith('1 '):
            c, cp, cm, child = transform(line, p, m, color)
            if child in models and child.lower().endswith('.ldr'):
                child_steps = timeline(models, child, cp, cm, c, stack+(name,))
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


def run_render(args, model, output, camera, first=None, last=None, highlight=False):
    command = [args.leocad, '-l', str(args.ldraw), str(model), '-i', str(output),
               '-w', '1000', '-h', '800', '--orthographic', '--camera-angles',
               *map(str, camera), '--aa-samples', '4', '--line-width', '0.8']
    if first is not None:
        command += ['-f', str(first), '-t', str(last)]
    if highlight:
        command += ['--fade-steps', '--fade-steps-color', '#FFB8C3D1',
                    '--highlight', '--highlight-color', '#FF2563EB']
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, timeout=180)


def optimize(path):
    with Image.open(path) as img:
        img.save(path, optimize=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ldraw', required=True, type=Path)
    parser.add_argument('--leocad', default='/Applications/LeoCAD.app/Contents/MacOS/LeoCAD')
    parser.add_argument('--models', nargs='*', choices=list(CURATED), default=list(CURATED))
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
        if 'groups' in spec:
            lines = refs(models[target])
            indices = [i for group in spec['groups'] for i in group]
            assert sorted(indices) == list(range(len(lines))), f'{model_id}: missing or repeated placement'
            steps = [[lines[i] for i in group] for group in spec['groups']]
            assert Counter(line for step in steps for line in step) == Counter(lines)
        else:
            steps = timeline(models, target)
        assert steps and all(steps)
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
        if not unchanged or len(images) != len(steps):
            for stale in images:
                stale.unlink()
            run_render(args, guide_model, out/'step.png', manifest['camera'], 1, len(steps), True)
        images = sorted(out.glob('step[0-9]*.png'))
        assert len(images) == len(steps), (model_id, len(images), len(steps))
        guide = []
        for i, (step, img) in enumerate(zip(steps, images)):
            optimize(img)
            pieces = []
            for (color, name), count in Counter((l.split(maxsplit=14)[1], l.split(maxsplit=14)[14]) for l in step).items():
                slug = re.sub(r'[^a-zA-Z0-9_-]', '-', name.removesuffix('.dat'))+'-'+color
                thumb = part_dir/(slug+'.png')
                label = name
                part_file = args.ldraw/'parts'/name.replace('\\', '/')
                if part_file.exists():
                    label = part_file.read_text(errors='replace').splitlines()[0].removeprefix('0 ').strip()
                if not thumb.exists():
                    piece_model = part_dir/(slug+'.ldr')
                    piece_model.write_text('0 Piece preview\n'+placement(color, [0, 0, 0], IDENTITY, name)+'\n')
                    run_render(args, piece_model, thumb, [30, 45])
                    piece_model.unlink()
                    with Image.open(thumb) as im:
                        im.thumbnail((160, 128))
                        im.save(thumb, optimize=True)
                pieces.append({'id': slug, 'name': label, 'color': colors.get(color, color),
                               'count': count, 'image': '/'+str(thumb.relative_to(FRONTEND/'public'))})
            guide.append({'title': spec.get('titles', [])[i] if spec.get('titles') else
                          f'Add {len(step)} '+('piece' if len(step)==1 else 'pieces'),
                          'image': '/'+str(img.relative_to(FRONTEND/'public')), 'pieces': pieces})
        index[model_id] = {'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                           'sequence': 'curated' if 'groups' in spec else 'omr',
                           'modelUrl': '/'+str(guide_model.relative_to(FRONTEND/'public')),
                           'steps': guide}
        index_path.write_text(json.dumps(index, indent=2)+'\n')
        print(f'{model_id}: {len(steps)} picture steps cached', flush=True)


    credits = ['# Cached picture guide sources', '',
               'Derived from the OMR models credited below; original credits and licences are also retained in each guide.mpd.',
               'Step grouping for the dragon and dinosaur was added by the Blueprint project. Spaceship steps retain the OMR construction order.',
               'Part previews are rendered with the LDraw Parts Library. See [LDraw attribution and licences](../omr/CAreadme.txt), [CCAL](../omr/CAlicense.txt) and [CC BY 4.0](../omr/CAlicense4.txt).', '']
    for model in catalog['models']:
        if model['id'] in index:
            source = model['source']
            credits += [f"## {model['name']}", '',
                        f"Model by {source['author']}. {source['license']}",
                        f"[Original OMR source]({source['url']})", '',
                        f"Cached source SHA-256: `{index[model['id']]['sourceSha256']}`", '']
    (FRONTEND/'public/demo/instructions/SOURCES.md').write_text('\n'.join(credits)+'\n')

    # Refresh booklets from the same diagrams and index, so PDFs cannot silently
    # retain an older step sequence after the model preparation command.
    subprocess.run([sys.executable, str(Path(__file__).with_name('prepare-instruction-pdfs.py'))], check=True)


if __name__ == '__main__':
    main()
