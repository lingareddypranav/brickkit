/** Three.js prefixes subpart references, but leaves embedded MPD FILE names raw.
 * Normalize just those headers in memory; the attributed source files stay intact.
 */
export function normalizeEmbeddedPaths(source: string): string {
  return source.replace(/^0 FILE ([^\r\n]+)/gm, (_, name: string) => {
    let path = name.replace(/\\/g, "/");
    if (/^s\//.test(path)) path = `parts/${path}`;
    else if (/^48\//.test(path)) path = `p/${path}`;
    return `0 FILE ${path}`;
  });
}
