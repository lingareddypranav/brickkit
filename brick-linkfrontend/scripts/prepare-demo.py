"""Build the small offline catalogue from public Rebrickable CSV snapshots.

Usage: python3 scripts/prepare-demo.py /path/to/csv-download-directory
Input: sets.csv.gz, inventory_parts.csv.gz, inventories.csv.gz, colors.csv.gz.
The six mini designs below are original prototype recipes, not official LEGO models.
"""
import csv
import gzip
import json
import math
from pathlib import Path
import sys
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(sys.argv[1])
IDS = ['10696-1', '11001-1', '11017-1', '11014-1', '10698-1', '11019-1']

def rows(name):
    with gzip.open(DATA / (name + '.csv.gz'), 'rt') as f:
        yield from csv.DictReader(f)

colors = {int(r['id']): r for r in rows('colors')}
inventories = {r['id']: r['set_num'] for r in rows('inventories') if r['set_num'] in IDS and r['version'] == '1'}
set_data = {r['set_num']: r for r in rows('sets') if r['set_num'] in IDS}
stock = {s: Counter() for s in IDS}
for row in rows('inventory_parts'):
    if row['inventory_id'] in inventories and row['is_spare'].lower() in ('f', 'false', '0'):
        stock[inventories[row['inventory_id']]][row['part_num'] + ':' + row['color_id']] += int(row['quantity'])

# Dimensions are in studs, with height in plate units. Geometry is illustrative.
specs = {
    '3001': ('Big brick', 2, 4, 3, 'brick'), '3003': ('Square brick', 2, 2, 3, 'brick'),
    '3004': ('Little brick', 1, 2, 3, 'brick'), '3005': ('Tiny brick', 1, 1, 3, 'brick'),
    '3010': ('Long brick', 1, 4, 3, 'brick'), '3020': ('Flat brick', 2, 4, 1, 'plate'),
    '3022': ('Square plate', 2, 2, 1, 'plate'), '3039': ('Roof brick', 2, 2, 3, 'slope'),
    '3040b': ('Little roof', 1, 2, 3, 'slope'), '3062b': ('Round brick', 1, 1, 3, 'round'),
    '3795': ('Long plate', 2, 6, 1, 'plate'), '4600': ('Wheel holder', 2, 2, 1, 'axle'),
    '4624': ('Wheel centre', 1, 1, 1, 'wheel'), '87414': ('Little tyre', 1, 1, 1, 'tyre'),
}
placements = []
def p(part, color, x, y, z, step, rotate=0):
    return dict(key=f'{part}:{color}', x=x, y=y, z=z, step=step, **({'rotate': rotate} if rotate else {}))

models = []
def model(id, name, description, family, background, steps, pieces, tags=()):
    models.append(dict(id=id, name=name, description=description, family=family, tags=list(tags), background=background,
                       image=f'/demo/models/{id}.svg', minutes=len(steps)*2, steps=steps, placements=pieces,
                       inventory=dict(Counter(piece['key'] for piece in pieces))))

def chassis(length, wheels):
    out=[p('3795',15,0,1,0,1)] if length==6 else [p('3795',15,0,1,z,1) for z in [-3,3]]
    zs=[-2,2] if wheels==4 else [-4,-1.5,1.5,4]
    for z in zs:
        out.append(p('4600',0,0,0,z,1))
        for x in [-1.55,1.55]:
            out.extend([p('4624',71,x,0,z,2),p('87414',0,x,0,z,2)])
    return out

model('pocket-racer','Pocket racer','Small car. Big adventures.','rides','#C8DCE8',
      ['Make the base','Pop on the wheels','Add the red body','Ready, set, go!'],
      chassis(6,4)+[p('3001',4,0,2,0,3),p('3039',15,0,5,-1,4),p('3003',14,0,5,1,4)])
model('little-bus','Sunshine bus','Room for an imaginary friend.','rides','#E8D8AC',
      ['Make the base','Add four wheels','Build the yellow body','Put on the roof'],
      chassis(6,4)+[p('3001',14,0,2,0,3),p('3003',14,0,2,-2,3),p('3001',1,0,5,0,4),p('3020',15,0,8,0,4)])
model('sunny-duck','Sunny duck','A little friend for your desk.','animals','#EBD89A',
      ['Start with two feet','Build a sunny body','Add the head','Give your duck a beak'],
      [p('3004',25,x,0,0,1) for x in [-.5,.5]]+[p('3001',14,0,3,0,2),p('3003',14,0,6,-1,3),p('3004',25,0,9,-1.5,4,90),p('3003',14,0,6,1,3)])
model('little-dino','Little dino','A friendly, stompy sort of dinosaur.','animals','#C7D8B5',
      ['Make two stompy feet','Build the body','Add a head and tail','One little dino!'],
      [p('3004',2,x,0,0,1) for x in [-.5,.5]]+[p('3001',2,0,3,0,2),p('3003',2,0,6,-1,3),p('3004',2,0,9,-1.5,4,90),p('3004',2,0,3,2.5,3,90)])
model('little-rocket','Pocket rocket','Next stop: your very own moon.','space','#CFCAE5',
      ['Make a launch pad','Stack the rocket','Add a pointy top','Three, two, one!'],
      [p('3020',0,0,0,0,1),p('3003',15,0,1,0,2),p('3003',4,0,4,0,2),p('3003',15,0,7,0,3),p('3039',4,0,10,0,4)])
model('moon-rover','Moon explorer','Eight wheels for very big moon missions.','space','#C5D5E9',
      ['Make a long base','Add eight moon wheels','Build the explorers cabin','Add a bright roof','Your mission can begin!'],
      chassis(8,8)+[p('3001',1,0,2,z,3) for z in [-2,2]]+[p('3020',15,0,5,2,4),p('3003',15,0,5,-3,4),p('3003',14,0,5,-1,4),p('3020',15,0,8,-2,5)])

keys = set(k for m in models for k in m['inventory'])
# A few extra colour choices make the piece picker useful without a giant catalogue.
keys.update(f'{part}:{color}' for part in ['3001','3003','3004'] for color in [4,14,1,2])
parts=[]
for key in sorted(keys):
    part,color=key.split(':'); color=int(color); name,w,d,h,shape=specs[part]; c=colors[color]
    parts.append(dict(key=key,part=part,color=color,name=name,colorName=c['name'].replace('Light Bluish Gray','Light grey'),hex='#'+c['rgb'],width=w,depth=d,height=h,shape=shape))

sets=[dict(id=s,name=set_data[s]['name'],pieces=int(set_data[s]['num_parts']),year=int(set_data[s]['year']),image=f'/demo/sets/{s}.jpg',url=f'https://rebrickable.com/sets/{s}/',inventory=dict(stock[s])) for s in IDS]

# Seed extras to support every recipe except four tyres for the eight-wheel rover.
needed=Counter()
for m in models:
    for k,n in m['inventory'].items():needed[k]=max(needed[k],n)
loose={k:n-stock['10696-1'].get(k,0) for k,n in needed.items() if n>stock['10696-1'].get(k,0) and k!='87414:0'}
sample=dict(version=1,sets={'10696-1':dict(quantity=1,keepBuilt=False),'11017-1':dict(quantity=1,keepBuilt=True)},loose=loose,creations=[],wishlist=[])

out=ROOT/'lib/demo/catalog-data.json';out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(dict(parts=parts,sets=sets,models=models,sample=sample),indent=2)+'\n')

# Previews use the same positions and colours as the interactive models.
part_map={part['key']:part for part in parts}
def project(x,y,z): return (x-z)*22,(x+z)*10-y*18
def shade(hex,f):return '#'+''.join(f'{min(255,int(int(hex[i:i+2],16)*f)):02x}' for i in [1,3,5])
def preview(pieces, target):
    faces=[]
    allpoints=[]
    for piece in sorted(pieces,key=lambda p:p['x']+p['z']+p['y']*.1):
        part=part_map[piece['key']];x,y,z=piece['x'],piece['y']*.4,piece['z'];w,d,h=part['width'],part['depth'],part['height']*.4
        if piece.get('rotate')==90:w,d=d,w
        if part['shape'] in ('tyre','wheel'):
            if part['shape']=='wheel' and len(pieces)>1:continue
            cx,cy=project(x,y+.7,z);r=17
            faces.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{r*1.15}" fill="#27313B" stroke="#151C23" stroke-width="3"/><ellipse cx="{cx}" cy="{cy}" rx="8" ry="10" fill="#B0BDC9"/><ellipse cx="{cx}" cy="{cy}" rx="3" ry="4" fill="#566674"/>')
            allpoints.extend([(cx-r,cy-r),(cx+r,cy+r)]);continue
        corners=[project(x+dx,y+dy,z+dz) for dx,dy,dz in [(-w/2,h,-d/2),(w/2,h,-d/2),(w/2,h,d/2),(-w/2,h,d/2),(-w/2,0,-d/2),(w/2,0,-d/2),(w/2,0,d/2),(-w/2,0,d/2)]]
        allpoints.extend(corners)
        for ids,f in [([1,2,6,5],.75),([2,3,7,6],.88),([0,1,2,3],1.08)]:
            points=' '.join(f'{corners[i][0]},{corners[i][1]}' for i in ids)
            faces.append(f'<polygon points="{points}" fill="{shade(part["hex"],f)}" stroke="{shade(part["hex"],.7)}" stroke-width=".65" stroke-linejoin="round"/>')
        for sx in range(int(w)):
            for sz in range(int(d)):
                cx,cy=project(x-w/2+.5+sx,y+h,z-d/2+.5+sz)
                faces.append(f'<ellipse cx="{cx}" cy="{cy-1.5}" rx="5.5" ry="3" fill="{shade(part["hex"],1.12)}" stroke="{shade(part["hex"],.8)}" stroke-width=".8"/>')
    minx,miny=min(x for x,y in allpoints)-28,min(y for x,y in allpoints)-28
    maxx,maxy=max(x for x,y in allpoints)+28,max(y for x,y in allpoints)+28
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{minx} {miny} {maxx-minx} {maxy-miny}"><g>{"".join(faces)}</g></svg>')

for m in models:
    preview(m['placements'],ROOT/'public'/m['image'].lstrip('/'))
    for step in range(len(m['steps'])):
        preview([p for p in m['placements'] if p['step']<=step+1],ROOT/f'public/demo/steps/{m["id"]}-{step+1}.svg')
for part in parts:
    preview([dict(key=part['key'],x=0,y=0,z=0,step=1)],ROOT/f'public/demo/parts/{part["key"].replace(":","-")}.svg')
print(f'Prepared {len(sets)} sets, {len(models)} blueprints, and {len(parts)} piece choices.')
