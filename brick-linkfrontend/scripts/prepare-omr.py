#!/usr/bin/env python3
"""Rebuild the offline OMR catalogue. Requires requests, LeoCAD and an LDraw library.

python3 scripts/prepare-omr.py --data-dir /path/to/rebrickable-csvs --ldraw /path/to/ldraw
The CSV directory contains Rebrickable's sets, inventories, inventory_parts, parts,
and colors .csv.gz downloads. No API key or model-generation service is involved.
"""
import argparse
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import requests

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--data-dir', type=Path, required=True)
parser.add_argument('--ldraw', type=Path, required=True)
parser.add_argument('--leocad', default='/Applications/LeoCAD.app/Contents/MacOS/LeoCAD')
parser.add_argument('--cache', type=Path, default=Path('/tmp/brickkit-omr-cache'))
args = parser.parse_args()
args.cache.mkdir(parents=True, exist_ok=True)
public = ROOT / 'public'
assets = public / 'demo/omr'
assets.mkdir(parents=True, exist_ok=True)
for license_name in ['CAreadme.txt', 'CAlicense.txt', 'CAlicense4.txt']:
    (assets / license_name).write_bytes((args.ldraw / license_name).read_bytes())
catalog_path = ROOT / 'lib/demo/catalog-data.json'
previous = json.loads(catalog_path.read_text())
manifest = json.loads((ROOT / 'scripts/omr-models.json').read_text())
selected = {m['setId'] for m in manifest}

def rows(name):
    with gzip.open(args.data_dir / f'{name}.csv.gz', 'rt', encoding='utf-8') as f:
        yield from csv.DictReader(f)

def download(url, path):
    if not path.exists():
        response = requests.get(url, timeout=45)
        response.raise_for_status()
        path.write_bytes(response.content)
    return path.read_bytes()

set_rows = {r['set_num']: r for r in rows('sets') if r['set_num'] in selected}
# Version 1 is the standard retail inventory, without spare parts.
inventory_ids = {r['id']: r['set_num'] for r in rows('inventories')
                 if r['set_num'] in selected and r['version'] == '1'}
inventories = {id: {} for id in selected}
images = {}
for r in rows('inventory_parts'):
    if r['inventory_id'] not in inventory_ids or r['is_spare'].lower() not in ('false', 'f', '0'):
        continue
    key = f"{r['part_num']}:{r['color_id']}"
    inventory = inventories[inventory_ids[r['inventory_id']]]
    inventory[key] = inventory.get(key, 0) + int(r['quantity'])
    images[key] = r['img_url']
part_rows = {r['part_num']: r for r in rows('parts')}
colors = {r['id']: r for r in rows('colors')}
parts = {p['key']: p for p in previous['parts']}
for key, image in images.items():
    part, color = key.rsplit(':', 1)
    c = colors[color]
    parts[key] = dict(key=key, part=part, color=int(color), name=part_rows[part]['name'],
                      colorName=c['name'], hex='#'+c['rgb'], image=image,
                      width=1, depth=1, height=1, shape='brick')
sets = {s['id']: s for s in previous['sets']}
for id in sorted(selected):
    r = set_rows[id]
    assert inventories[id], f'Missing retail inventory: {id}'
    photo = public / f'demo/sets/{id}.jpg'
    download(r['img_url'], photo)
    sets[id] = dict(id=id, name=r['name'], pieces=int(r['num_parts']), year=int(r['year']),
                    image=f'/demo/sets/{id}.jpg', url=f'https://rebrickable.com/sets/{id}/',
                    inventory=inventories[id])

models = []
attributions = []
for m in manifest:
    original = download(m['downloadUrl'], args.cache / m['downloadUrl'].rsplit('/', 1)[1])
    text = original.decode('utf-8-sig')
    assert text.startswith('0 '), f"Not an LDraw model: {m['downloadUrl']}"
    author = re.search(r'^0 Author: (.+)', text, re.M).group(1).strip()
    license = re.search(r'^0 !LICENSE (.+)', text, re.M).group(1).strip()
    if 'submodel' in m:
        # New root selects an existing assembly. Every original header is retained.
        assert '0 FILE '+m['submodel'] in text
        text = (f"0 FILE {m['id']}.ldr\n0 {m['name']} — assembly from {m['setId']}\n"
                f"0 Name: {m['id']}.ldr\n0 Author: {author}\n0 !LICENSE {license}\n"
                f"0 !HISTORY 2026-10-17 [Brickkit] Selected original dragon assembly\n"
                f"1 16 0 0 0 1 0 0 0 1 0 0 0 1 {m['submodel']}\n\n"+text)
    file = assets / f"{m['id']}.mpd"
    file.write_text(text, encoding='utf-8')
    preview = assets / f"{m['id']}.png"
    if not preview.exists():
        result = subprocess.run([args.leocad, '-l', str(args.ldraw), str(file), '-i', str(preview),
            '-w', '1000', '-h', '800', '--camera-angles', *map(str, m['camera']),
            '--orthographic', '--aa-samples', '4', '--line-width', '0.7'], capture_output=True)
        if result.returncode or not preview.exists():
            raise RuntimeError(result.stderr.decode(errors='replace'))
    source = dict(provider='LDraw OMR', setId=m['setId'], url=m['sourceUrl'],
                  downloadUrl=m['downloadUrl'], author=author, license=license,
                  sha256=hashlib.sha256(original).hexdigest(), inventoryBasis='model' if 'inventory' in m else 'source-set',
                  instructionsUrl=f"https://www.lego.com/en-us/service/building-instructions/{m['setId'].split('-')[0]}")
    if 'submodel' in m:
        source['submodel'] = m['submodel']
    background = {'rides':'#E8F0F5','animals':'#F5E9DC','dinosaurs':'#E5EEDC',
                  'dragons':'#F3E0D7','space':'#E6E7F3'}[m['family']]
    inventory = m.get('inventory', inventories[m['setId']])
    assert all(0 < n <= inventories[m['setId']].get(key, 0) for key, n in inventory.items())
    models.append(dict(id=m['id'], name=m['name'], description=m['description'], family=m['family'],
        tags=[m['family'], m['setId'], 'omr'], background=background,
        image=f"/demo/omr/{m['id']}.png", modelUrl=f"/demo/omr/{m['id']}.mpd",
        minutes=max(5, math.ceil(sum(inventory.values())/6)),
        steps=[], placements=[], inventory=inventory, source=source))
    attributions.append(f"| {m['name']} | [{m['setId']}]({m['sourceUrl']}) | {author} | {license} |")
    print('Prepared', m['id'], flush=True)

# Preserve independently prepared booklet-backed builds.
models.extend(m for m in previous['models'] if m.get('source', {}).get('provider') == 'LEGO')

sample = dict(version=1, sets={id:dict(quantity=1, keepBuilt=(id=='31027-1'))
    for id in ['30542-1','6741-1','7219-1','31027-1']}, loose={}, creations=[], wishlist=[])
data = dict(parts=list(parts.values()), sets=list(sets.values()), models=models,
            legacyModels=previous.get('legacyModels', previous['models']), sample=sample)
catalog_path.write_text(json.dumps(data, indent=2, ensure_ascii=False)+'\n')
(assets/'SOURCES.md').write_text('''# Real OMR builds

Models downloaded from the official LDraw OMR. Original author and licence headers
are retained in every MPD. PNG previews are rendered from those MPDs with LeoCAD.
Molded-body dragon models are retired from suggestions. Their cached assets remain for saved-creation history.

| Build | OMR source | Author | File licence |
| --- | --- | --- | --- |
'''+ '\n'.join(attributions)+'''

CCAL 2.0: https://www.ldraw.org/article/227.html
CC BY 4.0: https://creativecommons.org/licenses/by/4.0/

Collection checks
and reservations deliberately use the complete source set's
Rebrickable version-1 inventory, excluding spares. This is conservative for
alternate builds; they can require fewer pieces. These
are not exact inventories extracted from LDraw submodels. Rebrickable part images
and set photos are attributed to https://rebrickable.com/downloads/.
Time estimates are approximate (six source-set pieces per minute), not official
age ratings. Instructions link to LEGO's official lookup; availability can vary.
''')
