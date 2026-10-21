#!/usr/bin/env python3
"""Package the cached LeoCAD diagrams as simple printable step booklets.

Two steps per page: the photo, then each piece with how many to add.
Run after prepare-instructions.py. Requires ReportLab.
"""
import argparse
from io import BytesIO
import json
import math
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

FRONTEND = Path(__file__).resolve().parents[1]
PUBLIC = FRONTEND / 'public'
WIDTH, HEIGHT = A4
INK = HexColor('#172646')
RULE = HexColor('#E5E7EB')
MARGIN = 36
# Images are drawn at this many pixels per PDF point (300 dpi). The source
# photos are much larger; extra pixels only inflate the file.
PRINT_SCALE = 300 / 72
_images = {}


def local(url):
    path = (PUBLIC / url.lstrip('/')).resolve()
    if not path.is_relative_to(PUBLIC.resolve()) or not path.is_file():
        raise ValueError(f'Missing or invalid guide asset: {url}')
    return path


def pdf_image(url, width, height):
    """Embed a print-sized JPEG: sharp at 300 dpi, far smaller than the source PNG."""
    max_w = max(32, round(width * PRINT_SCALE))
    max_h = max(32, round(height * PRINT_SCALE))
    key = (url, max_w, max_h)
    if key not in _images:
        image = Image.open(local(url)).convert('RGBA')
        box = image.getbbox()
        if box:
            image = image.crop(box)
        image.thumbnail((max_w, max_h), Image.Resampling.LANCZOS)
        paper = Image.new('RGB', image.size, (255, 255, 255))
        paper.paste(image, mask=image.getchannel('A'))
        buffer = BytesIO()
        paper.save(buffer, format='JPEG', quality=90, optimize=True, subsampling=0)
        _images[key] = buffer.getvalue()
    return ImageReader(BytesIO(_images[key]))


def picture(pdf, url, x, y, width, height):
    pdf.drawImage(pdf_image(url, width, height), x, y, width, height,
                  preserveAspectRatio=True, anchor='c')


def draw_pieces(pdf, pieces, x, y, width, height):
    if not pieces:
        return
    count = len(pieces)
    gap = 6
    slot = min(58, (width - (count - 1) * gap) / count)
    image_h = min(slot * 0.78, height - 16)
    row = count * slot + (count - 1) * gap
    left = x + (width - row) / 2
    for i, piece in enumerate(pieces):
        px = left + i * (slot + gap)
        picture(pdf, piece['image'], px, y + 14, slot, image_h)
        pdf.setFillColor(INK)
        pdf.setFont('Helvetica-Bold', 10)
        pdf.drawCentredString(px + slot / 2, y, f"×{piece['count']}")


def draw_step(pdf, step, number, x, y, width, height):
    pdf.setFillColor(INK)
    pdf.setFont('Helvetica-Bold', 16)
    pdf.drawString(x, y + height - 16, str(number))
    pdf.setFont('Helvetica', 10)
    pdf.drawString(x + 32, y + height - 14, step['title'])
    pieces_h = 70
    photo_bottom = y + pieces_h + 8
    photo_height = height - pieces_h - 28
    if photo_height > 40:
        picture(pdf, step['image'], x, photo_bottom, width, photo_height)
    draw_pieces(pdf, step['pieces'], x, y, width, pieces_h)


def make_booklet(model, guide, output):
    steps = guide['steps']
    total = max(1, math.ceil(len(steps) / 2))
    pdf = canvas.Canvas(str(output), pagesize=A4, invariant=1, pageCompression=1)
    pdf.setTitle(f"{model['name']} - building instructions")
    pdf.setAuthor('Blueprint; OMR model by ' + model['source']['author'])
    pdf.setSubject('LeoCAD-rendered picture steps with piece counts')
    inner_h = HEIGHT - 2 * MARGIN
    gap = 18
    half = (inner_h - gap) / 2
    for start in range(0, len(steps), 2):
        pdf.setFillColor(white)
        pdf.rect(0, 0, WIDTH, HEIGHT, stroke=0, fill=1)
        pdf.setFillColor(INK)
        pdf.setFont('Helvetica-Bold', 10)
        pdf.drawString(MARGIN, HEIGHT - 20, model['name'])
        pair = steps[start:start + 2]
        if len(pair) == 2:
            draw_step(pdf, pair[1], start + 2, MARGIN, MARGIN, WIDTH - 2 * MARGIN, half)
            pdf.setStrokeColor(RULE)
            pdf.setLineWidth(0.8)
            pdf.line(MARGIN, MARGIN + half + gap / 2,
                     WIDTH - MARGIN, MARGIN + half + gap / 2)
            draw_step(pdf, pair[0], start + 1, MARGIN, MARGIN + half + gap,
                      WIDTH - 2 * MARGIN, half)
        else:
            draw_step(pdf, pair[0], start + 1, MARGIN, MARGIN + half + gap,
                      WIDTH - 2 * MARGIN, half)
        pdf.setFillColor(INK)
        pdf.setFont('Helvetica', 7)
        license_name = 'CC BY 4.0' if 'CC BY 4.0' in model['source']['license'] else 'CCAL 2.0'
        credit = f"OMR: {model['source']['author']} | {license_name}"
        pdf.drawString(MARGIN, 15, credit)
        pdf.linkURL(model['source']['url'], (MARGIN, 10, WIDTH - MARGIN - 45, 24), relative=0)
        pdf.drawRightString(WIDTH - MARGIN, 15, f'{start // 2 + 1} / {total}')
        pdf.showPage()
    pdf.save()
    return total


def rasterize(pdf_path, folder, pages=3):
    """Write the first pages as PNGs so a preview can be reviewed in the editor."""
    import pypdfium2 as pdfium
    document = pdfium.PdfDocument(str(pdf_path))
    folder.mkdir(parents=True, exist_ok=True)
    written = []
    for i in range(min(pages, len(document))):
        image = document[i].render(scale=2).to_pil()
        out = folder / f'page-{i + 1:02}.png'
        image.save(out, optimize=True)
        written.append(out)
    return written


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview', nargs='?', const='shuttle-explorer',
                        help='Write one model to a preview folder instead of replacing booklets')
    parser.add_argument('--preview-pages', type=int, default=3)
    parser.add_argument('--models', nargs='+', help='Rebuild only these prepared model IDs')
    args = parser.parse_args()
    index_path = FRONTEND / 'lib/demo/instructions-data.json'
    guides = json.loads(index_path.read_text())
    catalog = json.loads((FRONTEND / 'lib/demo/catalog-data.json').read_text())
    models = {m['id']: m for m in catalog['models']}
    if args.models:
        unknown = set(args.models) - set(guides)
        if unknown:
            raise SystemExit('No prepared guides for: ' + ', '.join(sorted(unknown)))

    if args.preview:
        model_id = args.preview
        guide = guides[model_id]
        if guide.get('kind') == 'booklet' or guide.get('sequence') == 'booklet':
            raise SystemExit(f'{model_id} uses an original LEGO booklet')
        folder = Path('/tmp/brickkit-pdf-preview') / model_id
        folder.mkdir(parents=True, exist_ok=True)
        output = folder / 'instructions.pdf'
        pages = make_booklet(models[model_id], guide, output)
        images = rasterize(output, folder, args.preview_pages)
        print(f'Preview {model_id}: {pages} pages -> {output}', flush=True)
        for image in images:
            print(f'  {image}', flush=True)
        return

    for model_id, guide in guides.items():
        if args.models and model_id not in args.models:
            continue
        if guide.get('kind') == 'booklet' or guide.get('sequence') == 'booklet':
            continue  # Original booklets stay linked from LEGO; do not repackage them.
        output = PUBLIC / 'demo/instructions' / model_id / 'instructions.pdf'
        pages = make_booklet(models[model_id], guide, output)
        guide['pdfUrl'] = '/' + str(output.relative_to(PUBLIC))
        print(f'{model_id}: {pages} PDF pages', flush=True)
    index_path.write_text(json.dumps(guides, indent=2) + '\n')


if __name__ == '__main__':
    main()
