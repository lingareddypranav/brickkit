# Offline design-challenge catalogue

Set names, set images, colours, and non-spare inventories are a small snapshot of the public Rebrickable downloads, retrieved 2026-10-17:

- https://rebrickable.com/downloads/
- https://rebrickable.com/sets/10696-1/
- https://rebrickable.com/sets/10698-1/
- https://rebrickable.com/sets/11001-1/
- https://rebrickable.com/sets/11014-1/
- https://rebrickable.com/sets/11017-1/
- https://rebrickable.com/sets/11019-1/

Set counts are the catalog's stated counts. Available-piece counts use the non-spare inventory snapshot and can differ due to inventory conventions. No current prices or availability are claimed.

The fourteen mini builds, vector previews, and step illustrations are original Brick Kit prototype designs. Geometry is illustrative; physical builds have not been tested. They are separate from the existing OMR retrieval feature at /explore. Every recipe uses the same placements for its picture, step illustrations, 3D preview, and bill of materials.

Rebuild local catalogue and vector images with `python3 scripts/prepare-demo.py /path/to/downloads`. Input files: sets.csv.gz, inventories.csv.gz, inventory_parts.csv.gz, colors.csv.gz. Bulk input data and credentials are not committed.
