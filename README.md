# Blueprint

Hackathon workspace. One git repo, three folders, so the design system, landing page, and product can be pushed together.

Remote: [lingareddypranav/brickkit](https://github.com/lingareddypranav/brickkit), branch `redesign`.

| Folder | What it is |
| --- | --- |
| [`design-system/`](design-system/) | Foundations: tokens, type, logo, bricks. Source of truth, not Figma. |
| [`landing/`](landing/) | Marketing page. Uses the design system styles and scripts. |
| [`product/`](product/) | Brickkit — AI LEGO build generator (FastAPI + Next.js). |

## Run the workspace

Use Node.js 20.11 or newer. Install the product's dependencies once, then run
from this workspace root:

```bash
npm --prefix product/brick-linkfrontend ci
npm run dev
```

- Product: [http://localhost:3000/](http://localhost:3000/)
- Landing page: [http://localhost:3000/landing](http://localhost:3000/landing)
- Design system: [http://localhost:3000/design-system](http://localhost:3000/design-system)

The landing page's Get Started links return to the product on the same origin.
`npm run build` and `npm start` use the same routes in production.
The dev and build commands copy the standalone site sources into ignored public
folders. Edit `landing/` and `design-system/`, then run `npm run site:sync` or
restart the dev server to refresh those static pages. The product imports shared
design CSS directly, so its token and logo changes update without a copy step.

The collection, curated builds, shopping suggestions and cached picture guides
work without the Python API. Original LEGO dragon booklets need internet access.
For the live OMR explorer at `/explore`, install `product/requirements.txt`, keep
backend settings in `product/.env`, and start the API from `product/`:

```bash
cd product
LDRAW_PATH=/path/to/ldraw python3 -m src.main
```

Run `npm test` from the workspace root for collection/catalogue checks and
instruction preparation tests. See [the prototype architecture](product/docs/prototype-architecture.md)
and [demo preparation](product/docs/product-demo.md) for the curated-data shortcuts,
prepared models, PDF sources and video workflow.

## Use the design system

```html
<link rel="stylesheet" href="./design-system/styles/index.css" />
```

```html
<a class="bp-lockup bp-lockup--tile bp-lockup--md bp-lockup--on-light" href="/">
  <span class="bp-mark" aria-hidden="true"></span>
  <span class="bp-wordmark">Blueprint</span>
</a>
```

Tokens: `design-system/styles/tokens.css` and `design-system/tokens/tokens.json`. Product copy lives in `design-system/tokens/copy.json`.

## Design system

Blueprint turns the bricks kids already own into the things they imagine. Colors and brick paths are copied from the [Lego Hackathon file](https://www.figma.com/design/RWPPoe8mWcucQALEhgeGGy/Lego-Hackathon?node-id=5-486). The wordmark B aligns to the brick body. Use the open lockup (brick only) or `bp-lockup--tile` (Figma 400 square around the same brick).

| Layer | Grid |
| --- | --- |
| Logo + bricks | Exact Figma: 2-wide brick 300×225, 12px radius, B aligned to 175px body |
| UI / landing | 8pt: 4 / 8 / 16 / 24 / 32 / 40 / 48 / 64… |

- **Type:** [Host Grotesk](https://fonts.google.com/specimen/Host+Grotesk). −1% tracking everywhere except the wordmark (0%). Body is 20pt Regular.
- **Color:** only `light1` `#F6F4EB`, `blue1` `#3860E5`, `dark1` `#2F2F2F`, `orange1` `#F85F19`. Muted is dark1 at 64% on cream (`--bp-muted-1`), not a fifth hue. Orange is accent / CTA.
- **Tap:** 48px minimum.
- **Texture:** Bayer 8×8 overlay (`design-system/assets/textures/dither-bayer.svg`) on logos and bricks only. Page stays flat cream.
