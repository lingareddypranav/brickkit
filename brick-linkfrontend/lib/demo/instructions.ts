import data from "./instructions-data.json";

export interface InstructionPiece {
  id: string;
  name: string;
  color: string;
  count: number;
  image: string;
}

export interface PictureGuide {
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

// Assets and construction order live outside presentation, so a redesign can
// reuse the guides without depending on LeoCAD or the API at runtime.
const guides: Record<string, PictureGuide> = data as Record<
  string,
  PictureGuide
>;

export function instructionsFor(modelId: string): PictureGuide | undefined {
  return guides[modelId];
}
