#!/usr/bin/env python3
"""Prepare brick-built dragon options backed by original LEGO booklets.

Booklets are verified in a private preparation cache and linked from LEGO's CDN,
not copied into frontend public assets. Collection inventories use the same
Rebrickable CSV contract as prepare-omr.py. No renderer or live API is required.
"""
import argparse
import csv
import gzip
import hashlib
import json
import math
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RETIRED = {'dragon-friend', 'dragon-wagon'}


def matte_preview(jpg: Path, png: Path, keys: list[tuple[int, int, int]], tol: int = 32) -> str:
    """Drop solid photo mattes so build cards can use the card background color."""
    im = Image.open(jpg).convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            for kr, kg, kb in keys:
                if abs(r - kr) <= tol and abs(g - kg) <= tol and abs(b - kb) <= tol:
                    px[x, y] = (r, g, b, 0)
                    break
    png.parent.mkdir(parents=True, exist_ok=True)
    im.save(png, optimize=True)
    return f"/{png.relative_to(ROOT / 'public')}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, required=True)
    parser.add_argument('--cache', type=Path, required=True)
    args = parser.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    path = ROOT/'lib/demo/catalog-data.json'
    catalog = json.loads(path.read_text())
    manifest = json.loads((ROOT/'scripts/booklet-models.json').read_text())
    selected = {m['setId'] for m in manifest}

    def rows(name):
        with gzip.open(args.data_dir/f'{name}.csv.gz', 'rt', encoding='utf-8') as stream:
            yield from csv.DictReader(stream)

    def download(url, dest):
        if not dest.exists():
            response = requests.get(url, timeout=60)
            response.raise_for_status()
            dest.write_bytes(response.content)
        return dest.read_bytes()

    sets_data = {r['set_num']: r for r in rows('sets') if r['set_num'] in selected}
    ids = {r['id']: r['set_num'] for r in rows('inventories')
           if r['set_num'] in selected and r['version'] == '1'}
    inventories = {id: {} for id in selected}
    images = {}
    for row in rows('inventory_parts'):
        if row['inventory_id'] not in ids or row['is_spare'].lower() not in ('false', 'f', '0'):
            continue
        key = f"{row['part_num']}:{row['color_id']}"
        inventory = inventories[ids[row['inventory_id']]]
        inventory[key] = inventory.get(key, 0)+int(row['quantity'])
        images[key] = row['img_url']
    parts = {p['key']: p for p in catalog['parts']}
    part_rows = {r['part_num']: r for r in rows('parts')}
    colors = {r['id']: r for r in rows('colors')}
    for key, image in images.items():
        part, color = key.rsplit(':', 1)
        c = colors[color]
        parts[key] = dict(key=key, part=part, color=int(color), name=part_rows[part]['name'],
                          colorName=c['name'], hex='#'+c['rgb'], image=image,
                          width=1, depth=1, height=1, shape='brick')

    sets = {s['id']: s for s in catalog['sets']}
    guide_path = ROOT/'lib/demo/instructions-data.json'
    guides = json.loads(guide_path.read_text())
    legacy = {m['id']: m for m in catalog['legacyModels']}
    for model in catalog['models']:
        if model['id'] in RETIRED:
            legacy[model['id']] = model
    replacement_ids = {m['id'] for m in manifest}
    active = [m for m in catalog['models'] if m['id'] not in RETIRED | replacement_ids]
    for m in manifest:
        row = sets_data[m['setId']]
        inventory = inventories[m['setId']]
        assert inventory, f"Missing inventory: {m['setId']}"
        # This regression guard rules out the old one-piece-body shortcut.
        assert not any(key.split(':')[0] in {'75174', '6129', '6129c01'} for key in inventory)
        pdf = download(m['pdfUrl'], args.cache/f"{m['setId']}.pdf")
        assert pdf.startswith(b'%PDF-'), 'Instruction link is not a PDF'
        assert hashlib.sha256(pdf).hexdigest() == m['pdfSha256'], 'Booklet changed; review its assembly steps first'
        set_photo = f"/demo/sets/{m['setId']}.jpg"
        download(row['img_url'], ROOT/'public'/set_photo.lstrip('/'))
        matte_keys = [(255, 255, 255)]
        if m['setId'] == '31102-1':
            matte_keys.append((0, 0, 0))
        elif m['setId'] == '31145-1':
            matte_keys = [(0, 0, 0)]
        preview = matte_preview(
            ROOT / 'public' / set_photo.lstrip('/'),
            ROOT / 'public' / 'demo' / 'models' / f"{m['id']}-preview.png",
            matte_keys,
            tol=36 if m['setId'] == '31102-1' else 32,
        )
        sets[m['setId']] = dict(id=m['setId'], name=row['name'], pieces=int(row['num_parts']),
                               year=int(row['year']), image=set_photo, inventory=inventory,
                               url=f"https://rebrickable.com/sets/{m['setId']}/")
        active.append(dict(id=m['id'], name=m['name'], description=m['description'],
                           family=m['family'], tags=['dragons', m['setId'], 'brick-built'],
                           background='#F3E0D7', image=preview, minutes=max(5, math.ceil(sum(inventory.values())/6)),
                           steps=[], placements=[], inventory=inventory,
                           source=dict(provider='LEGO', setId=m['setId'], url=m['sourceUrl'],
                                       downloadUrl=m['pdfUrl'], author='The LEGO Group',
                                       license='Original LEGO building instructions, linked from LEGO.com.',
                                       sha256=m['pdfSha256'], inventoryBasis='source-set',
                                       instructionsUrl=m['pdfUrl'])))
        guides[m['id']] = dict(kind='booklet', provider='LEGO', pdfUrl=m['pdfUrl'],
                               sourceUrl=m['sourceUrl'], pageCount=m['pageCount'], minimumAge=m['minimumAge'], startPage=m['startPage'])
        print(m['name'], sum(inventory.values()), 'source-set pieces; original booklet verified', flush=True)
    for id in RETIRED:
        guides.pop(id, None)
    for guide in guides.values():
        if guide.get('kind') != 'booklet':
            guide['kind'] = 'pictures'
    catalog.update(parts=list(parts.values()), sets=list(sets.values()), models=active, legacyModels=list(legacy.values()))
    path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False)+'\n')
    guide_path.write_text(json.dumps(guides, indent=2)+'\n')


if __name__ == '__main__':
    main()
