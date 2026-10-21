#!/usr/bin/env python3
"""Audit prepared OMR guides and optionally write contact sheets for visual review.

Requires Pillow, NumPy and pypdfium2 on the asset-preparation machine only.
The source/placement regression tests separately verify construction completeness.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
import pypdfium2 as pdfium

FRONTEND = Path(__file__).resolve().parents[1]
PUBLIC = FRONTEND / 'public'


def local(url):
    path = (PUBLIC / url.lstrip('/')).resolve()
    if not path.is_relative_to(PUBLIC.resolve()) or not path.is_file():
        raise ValueError(f'Missing local instruction asset: {url}')
    return path


def visible_highlight(image):
    preview = image.copy()
    preview.thumbnail((1600, 1280))
    pixels = np.asarray(preview.convert('RGBA')).astype(np.int16)
    blue = (np.abs(pixels[:, :, :3] - [37, 99, 235]) < 24).all(axis=2)
    return int((blue & (pixels[:, :, 3] > 128)).sum())


def contact_sheet(images, labels, output, columns=5, cell=(240, 210)):
    sheet = Image.new('RGB', (columns*cell[0], math.ceil(len(images)/columns)*cell[1]), '#F8F8F3')
    draw = ImageDraw.Draw(sheet)
    for i, (path, label) in enumerate(zip(images, labels)):
        with Image.open(path) as source:
            image = source.convert('RGBA')
            image = image.crop(image.getbbox())
            image.thumbnail((cell[0]-16, cell[1]-40))
            x, y = (i % columns)*cell[0], (i // columns)*cell[1]
            draw.text((x+8, y+8), label, fill='#172646')
            sheet.paste(image, (x+(cell[0]-image.width)//2, y+30), image)
    sheet.save(output, quality=92)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--models', nargs='+')
    parser.add_argument('--review-dir', type=Path)
    args = parser.parse_args()
    guides = json.loads((FRONTEND/'lib/demo/instructions-data.json').read_text())
    reports = []
    if args.review_dir:
        args.review_dir.mkdir(parents=True, exist_ok=True)
    for model_id, guide in guides.items():
        if guide.get('kind') != 'pictures' or guide.get('sequence') == 'booklet':
            continue
        if args.models and model_id not in args.models:
            continue
        steps = guide['steps']
        assert len(steps) > 1, f'{model_id}: no construction sequence'
        hashes, highlights, pictures = set(), [], []
        for number, step in enumerate(steps, 1):
            path = local(step['image'])
            with Image.open(path) as source:
                image = source.convert('RGBA')
                box = image.getbbox()
                assert box and min(image.size) >= 256, f'{model_id}/{number}: empty or low-resolution diagram'
                assert box[0] > 0 and box[1] > 0 and box[2] < image.width and box[3] < image.height, f'{model_id}/{number}: model touches canvas edge'
                highlights.append(visible_highlight(image))
            hashes.add(hashlib.sha256(path.read_bytes()).hexdigest())
            pictures.append(path)
            assert step['pieces'], f'{model_id}/{number}: missing piece callout'
            for piece in step['pieces']:
                assert piece['count'] > 0 and piece['name'], f'{model_id}/{number}: incomplete piece callout'
                with Image.open(local(piece['image'])) as thumb:
                    assert thumb.getbbox(), f'{model_id}/{number}: blank piece thumbnail'
        assert len(hashes) == len(steps), f'{model_id}: repeated images'
        pdf_path = local(guide['pdfUrl'])
        document = pdfium.PdfDocument(str(pdf_path))
        try:
            pages = len(document)
            assert pages == math.ceil(len(steps)/2), f'{model_id}: PDF page count does not match its steps'
            if args.review_dir:
                sample = sorted({0, pages//2, pages-1})
                rendered = []
                for page_index in sample:
                    page = document[page_index]
                    output = args.review_dir/f'{model_id}-page-{page_index+1:02}.png'
                    page.render(scale=1.4).to_pil().save(output)
                    rendered.append(output)
                    page.close()
                contact_sheet(rendered, [f'PDF page {i+1}' for i in sample],
                              args.review_dir/f'{model_id}-pdf.jpg', columns=3, cell=(420, 620))
        finally:
            document.close()
        if args.review_dir:
            contact_sheet(pictures, [str(i+1) for i in range(len(steps))],
                          args.review_dir/f'{model_id}-steps.jpg')
        low = [i+1 for i, count in enumerate(highlights) if count < 100]
        report = {'model': model_id, 'steps': len(steps), 'pdfPages': pages,
                  'lowVisibilitySteps': low, 'highlightPixels': highlights}
        reports.append(report)
        print(json.dumps(report), flush=True)
        hidden = [i+1 for i, count in enumerate(highlights) if count < 15]
        assert not hidden, f'{model_id}: new pieces hidden in steps {hidden}; add a view or reorder'
    if not args.models:
        assert len(reports) >= 13, 'At least thirteen complete local OMR guides are required'
    if args.review_dir:
        (args.review_dir/'report.json').write_text(json.dumps(reports, indent=2)+'\n')


if __name__ == '__main__':
    main()
