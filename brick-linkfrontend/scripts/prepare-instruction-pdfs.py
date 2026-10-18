#!/usr/bin/env python3
"""Package the cached LeoCAD diagrams as illustrated, printable step booklets.

Run after prepare-instructions.py. No model search, live API or renderer needed.
Requires ReportLab. The diagrams and construction order are not invented here.
"""
import json
import math
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

FRONTEND = Path(__file__).resolve().parents[1]
PUBLIC = FRONTEND / 'public'
WIDTH, HEIGHT = A4
BLUE = HexColor('#3157C8')
INK = HexColor('#172646')
MUTED = HexColor('#53647D')
PALE = HexColor('#EDF3FD')
MARGIN = 40


def local(url):
    path = (PUBLIC / url.lstrip('/')).resolve()
    if not path.is_relative_to(PUBLIC.resolve()) or not path.is_file():
        raise ValueError(f'Missing or invalid guide asset: {url}')
    return path


def label(pdf, text, x, y, size=12, bold=False, color=INK):
    pdf.setFillColor(color)
    pdf.setFont('Helvetica-Bold' if bold else 'Helvetica', size)
    pdf.drawString(x, y, text)


def lines(pdf, text, x, y, width, size=12, leading=18, color=INK, bold=False):
    """Wrap using actual PDF font widths, rather than guessed character counts."""
    font = 'Helvetica-Bold' if bold else 'Helvetica'
    current = ''
    for word in text.split():
        trial = (current + ' ' + word).strip()
        if current and pdf.stringWidth(trial, font, size) > width:
            label(pdf, current, x, y, size, bold, color)
            y -= leading
            current = word
        else:
            current = trial
    if current:
        label(pdf, current, x, y, size, bold, color)
        y -= leading
    return y


def picture(pdf, url, x, y, width, height):
    # Keep the LeoCAD image intact. Alpha is preserved against the paper colour.
    pdf.drawImage(ImageReader(str(local(url))), x, y, width, height,
                  preserveAspectRatio=True, anchor='c', mask='auto')


def page_base(pdf, name, page, total):
    pdf.setFillColor(white)
    pdf.rect(0, 0, WIDTH, HEIGHT, stroke=0, fill=1)
    label(pdf, 'blueprint', MARGIN, HEIGHT-38, 16, True, BLUE)
    pdf.setFont('Helvetica', 10)
    pdf.setFillColor(MUTED)
    pdf.drawRightString(WIDTH-MARGIN, HEIGHT-36, name)
    pdf.setStrokeColor(HexColor('#CCD9F0'))
    pdf.line(MARGIN, HEIGHT-50, WIDTH-MARGIN, HEIGHT-50)
    label(pdf, 'BUILDING INSTRUCTIONS', MARGIN, 28, 8, True, MUTED)
    pdf.setFont('Helvetica', 9)
    pdf.drawRightString(WIDTH-MARGIN, 28, f'{page} / {total}')


def make_booklet(model, guide, output):
    steps = guide['steps']
    pdf = canvas.Canvas(str(output), pagesize=A4, invariant=1, pageCompression=1)
    pdf.setTitle(f"{model['name']} - building instructions")
    pdf.setAuthor('Blueprint; OMR model by '+model['source']['author'])
    pdf.setSubject('LeoCAD-rendered picture steps with piece callouts')
    total = len(steps)+2

    page_base(pdf, model['name'], 1, total)
    lines(pdf, model['name'], MARGIN, HEIGHT-126, WIDTH-2*MARGIN,
          34, 40, INK, True)
    label(pdf, 'Build it one step at a time.', MARGIN, HEIGHT-208, 18, color=MUTED)
    pdf.setFillColor(PALE)
    pdf.roundRect(MARGIN, 195, WIDTH-2*MARGIN, 385, 18, stroke=0, fill=1)
    picture(pdf, model['image'], MARGIN+15, 210, WIDTH-2*MARGIN-30, 355)
    label(pdf, f"{len(steps)} PICTURE STEPS", MARGIN, 148, 16, True, BLUE)
    label(pdf, 'Find the pieces. Match the picture. Turn the page.', MARGIN, 116, 12)
    label(pdf, 'A Blueprint guide made from an LDraw OMR model.', MARGIN, 76, 10, color=MUTED)
    pdf.showPage()

    for i, step in enumerate(steps, 1):
        page_base(pdf, model['name'], i+1, total)
        label(pdf, str(i), MARGIN, HEIGHT-126, 52, True, BLUE)
        lines(pdf, step['title'], MARGIN+85, HEIGHT-100,
              WIDTH-2*MARGIN-85, 21, 26, INK, True)
        cols = 6
        rows = math.ceil(len(step['pieces'])/cols)
        tray_top = HEIGHT-170
        tray_height = 30+rows*68
        tray_bottom = tray_top-tray_height
        pdf.setFillColor(PALE)
        pdf.roundRect(MARGIN, tray_bottom, WIDTH-2*MARGIN, tray_height, 10, stroke=0, fill=1)
        label(pdf, 'FIND THESE PIECES', MARGIN+14, tray_top-18, 9, True, BLUE)
        cell_width = (WIDTH-2*MARGIN-20)/cols
        for n, piece in enumerate(step['pieces']):
            x = MARGIN+10+(n%cols)*cell_width
            y = tray_top-30-(n//cols+1)*68
            picture(pdf, piece['image'], x, y+6, cell_width-10, 53)
            label(pdf, f"{piece['count']}x", x+cell_width-27, y+6, 12, True)
        picture(pdf, step['image'], MARGIN, 78, WIDTH-2*MARGIN, tray_bottom-98)
        pdf.setFont('Helvetica', 11)
        pdf.setFillColor(MUTED)
        pdf.drawCentredString(WIDTH/2, 53, f'Step {i} of {len(steps)}')
        pdf.showPage()

    page_base(pdf, model['name'], total, total)
    label(pdf, 'You built it!', MARGIN, HEIGHT-120, 34, True)
    picture(pdf, model['image'], MARGIN, 440, WIDTH-2*MARGIN, 240)
    source = model['source']
    y = lines(pdf, 'Keep it built, or use your pieces for a new adventure.',
              MARGIN, 417, WIDTH-2*MARGIN, 17, 24, INK, True)
    y -= 22
    for text in [f"OMR model by {source['author']}.", source['license'],
                 'Construction order: '+('curated for this picture guide.' if guide['sequence']=='curated'
                                         else 'based on the OMR model steps.'),
                 'Diagrams rendered with LeoCAD and the LDraw Parts Library. Booklet prepared by Blueprint.',
                 'This generated guide has not been physically build-tested. It is not an official LEGO instruction booklet.']:
        y = lines(pdf, text, MARGIN, y, WIDTH-2*MARGIN, 10, 15, MUTED)-10
    label(pdf, 'Original model and licence details', MARGIN, y, 10, color=BLUE)
    pdf.linkURL(source['url'], (MARGIN, y-2, WIDTH-MARGIN, y+12), relative=0)
    y -= 22
    label(pdf, 'LDraw attribution: ldraw.org and the bundled guide source credits.', MARGIN, y, 9, color=MUTED)
    pdf.linkURL('https://www.ldraw.org/article/227.html', (MARGIN, y-2, WIDTH-MARGIN, y+10), relative=0)
    pdf.save()


def main():
    index_path = FRONTEND/'lib/demo/instructions-data.json'
    guides = json.loads(index_path.read_text())
    catalog = json.loads((FRONTEND/'lib/demo/catalog-data.json').read_text())
    models = {m['id']: m for m in catalog['models']}
    for model_id, guide in guides.items():
        output = PUBLIC/'demo/instructions'/model_id/'instructions.pdf'
        make_booklet(models[model_id], guide, output)
        guide['pdfUrl'] = '/'+str(output.relative_to(PUBLIC))
        print(f"{model_id}: {len(guide['steps'])+2} PDF pages", flush=True)
    index_path.write_text(json.dumps(guides, indent=2)+'\n')


if __name__ == '__main__':
    main()
