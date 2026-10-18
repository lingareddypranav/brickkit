// Serves the LDraw parts library to the in-browser 3D viewer.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { join, normalize } from "path";

function resolveRoots() {
  const cwd = process.cwd();
  const candidates = [
    process.env.LDRAW_DIR,
    join(cwd, ".cache/ldraw"),
    join(cwd, "../../.cache/ldraw"),
    join(cwd, "public/landing/ldraw"),
    join(cwd, "../../landing/ldraw"),
    join(cwd, "public/ldraw"),
  ].filter((value): value is string => Boolean(value));

  const roots: string[] = [];
  for (const dir of candidates) {
    const nested = join(dir, "ldraw");
    for (const root of [dir, nested]) {
      if (
        existsSync(join(root, "LDConfig.ldr")) &&
        !roots.includes(root)
      ) {
        roots.push(root);
      }
    }
  }
  return roots;
}

function safeJoin(root: string, segs: string[]) {
  const p = normalize(join(root, ...segs));
  if (!p.startsWith(normalize(root))) throw new Error("Path traversal");
  return p;
}

const looksPrimitive = (name: string) =>
  /^(?:\d+-\d+|stud|box|rect|ring|con|cyli|cylo|edge|disc|ndis|tndis|chrd|filstud)/i.test(
    name,
  );

function fileResponse(path: string) {
  const stream = createReadStream(path);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const roots = resolveRoots();
  if (!roots.length) {
    return NextResponse.json(
      {
        error:
          "LDraw parts library not found. Download complete.zip from library.ldraw.org into .cache/ldraw.",
      },
      { status: 500 },
    );
  }

  const resolvedParams = await params;
  let rel = resolvedParams.key.join("/");
  rel = rel.replace(/^(models|parts|p)\/(parts|p)\//i, "$2/");
  rel = rel.replace(/^(models|parts|p)\//i, "");

  if (/^ldconfig\.ldr$/i.test(rel)) {
    for (const root of roots) {
      const f = safeJoin(root, ["LDConfig.ldr"]);
      if (existsSync(f)) return fileResponse(f);
    }
    return new NextResponse("Missing LDConfig.ldr", { status: 404 });
  }

  const baseName = rel.split("/").pop() || rel;
  for (const root of roots) {
    const candidates: string[] = [];
    if (looksPrimitive(baseName)) {
      candidates.push(safeJoin(root, ["p", rel]));
      candidates.push(safeJoin(root, ["parts", rel]));
    } else if (rel.startsWith("s/")) {
      candidates.push(safeJoin(root, ["parts", rel]));
    } else {
      candidates.push(safeJoin(root, ["parts", rel]));
      candidates.push(safeJoin(root, ["p", rel]));
    }
    for (const path of candidates) {
      if (existsSync(path) && statSync(path).isFile()) return fileResponse(path);
    }
  }

  return new NextResponse(`Not found: ${rel}`, { status: 404 });
}
