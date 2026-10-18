// app/ldraw/[...key]/route.ts
export const runtime = "nodejs"; // we need fs in dev

import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { join, normalize } from "path";

const ROOT = process.env.LDRAW_DIR || "/Users/pranavlingareddy/Desktop/ldraw"; // fallback to our known path

function safeJoin(root: string, segs: string[]) {
  const p = normalize(join(root, ...segs));
  if (!p.startsWith(normalize(root))) throw new Error("Path traversal");
  return p;
}

// quick helper: many "primitives" should come from p/
const looksPrimitive = (name: string) =>
  /^(?:\d+-\d+|stud|box|rect|ring|con|cyli|cylo|edge|disc|ndis|tndis|chrd|filstud)/i.test(name);

export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (!ROOT) return NextResponse.json({ error: "LDRAW_DIR not set" }, { status: 500 });

  // Await params as required by Next.js 15
  const resolvedParams = await params;

  // Normalize weird prefixes the loader/MPDs sometimes emit
  let rel = resolvedParams.key.join("/");
  
  // Handle double prefixes like "parts/parts/s/..." or "models/parts/s/..."
  rel = rel.replace(/^(models|parts|p)\/(parts|p)\//i, "$2/");
  
  // Remove single prefixes
  rel = rel.replace(/^(models|parts|p)\//i, "");

  // Special case: LDConfig.ldr
  if (/^ldconfig\.ldr$/i.test(rel)) {
    const f = safeJoin(ROOT, ["LDConfig.ldr"]);
    if (!existsSync(f)) return new NextResponse("Missing LDConfig.ldr", { status: 404 });
    const stream = createReadStream(f);
    return new Response(stream as any, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  // Decide candidate locations
  const baseName = rel.split("/").pop() || rel;
  const candidates: string[] = [];

  if (looksPrimitive(baseName)) {
    candidates.push(safeJoin(ROOT, ["p", rel]));       // p/<file> or p/8/...
    candidates.push(safeJoin(ROOT, ["parts", rel]));   // fallback
  } else if (rel.startsWith("s/")) {
    candidates.push(safeJoin(ROOT, ["parts", rel]));   // subparts live under parts/s/
  } else {
    candidates.push(safeJoin(ROOT, ["parts", rel]));   // normal part
    candidates.push(safeJoin(ROOT, ["p", rel]));       // fallback just in case
  }

  for (const path of candidates) {
    if (existsSync(path) && statSync(path).isFile()) {
      const stream = createReadStream(path);
      return new Response(stream as any, {
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  }

  return new NextResponse(`Not found: ${rel}`, { status: 404 });
}
