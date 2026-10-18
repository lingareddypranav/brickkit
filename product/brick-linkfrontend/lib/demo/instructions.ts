import data from "./instructions-data.json";

export interface InstructionPiece {
  id: string;
  name: string;
  color: string;
  count: number;
  image: string;
}

export interface PictureGuide {
  kind: "pictures";
  sourceSha256: string;
  sequence: "curated" | "omr";
  modelUrl: string;
  pdfUrl?: string;
  steps: {
    title: string;
    image: string;
    pieces: InstructionPiece[];
  }[];
}

export interface BookletGuide {
  kind: "booklet";
  provider: "LEGO";
  pdfUrl: string;
  sourceUrl: string;
  pageCount: number;
  startPage: number;
  minimumAge: number;
}

export type InstructionGuide = PictureGuide | BookletGuide;

// Assets and construction order live outside presentation, so a redesign can
// reuse the guides without depending on LeoCAD or the API at runtime.
const guides: Record<string, InstructionGuide> = data as unknown as Record<
  string,
  InstructionGuide
>;

export function instructionsFor(modelId: string): InstructionGuide | undefined {
  return guides[modelId];
}
