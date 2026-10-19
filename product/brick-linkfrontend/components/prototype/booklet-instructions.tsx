"use client";

import { BookOpen, ExternalLink } from "lucide-react";
import type { Blueprint } from "@/lib/demo/types";
import type { BookletGuide } from "@/lib/demo/instructions";

export function BookletInstructions({
  model,
  guide,
}: {
  model: Blueprint;
  guide: BookletGuide;
}) {
  return (
    <section
      className="booklet-instructions"
      aria-label={`${model.name} instructions`}
    >
      <div className="guide-stage" style={{ background: model.background }}>
        <img src={model.image} alt={model.name} />
      </div>
      <p className="omr-guide-intro">
        Start with loose pieces and follow the pictures, one page at a time.
      </p>
      <a
        className="kit-button kit-button-dark"
        href={`${guide.pdfUrl}#page=${guide.startPage}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <BookOpen size={20} /> Open building booklet <ExternalLink size={16} />
      </a>
    </section>
  );
}
