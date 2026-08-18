// dsh-file-mention — host half.
// Registers a webserver route that serves the workspace file/directory list as
// JSON so the browser half can offer an exact file picker without per-level
// RPC walks.
import { readdir } from "node:fs/promises";
import { isAbsolute, join, relative, sep } from "node:path";

/** Stable cordis plugin name (row id in cordis.patch.yml). */
const name = "file-mention";
/** Services this plugin needs before apply runs. */
const inject = ["webServer"];

/** Hard cap on collected entries so a pathological root (e.g. a home dir) can never hang the route. */
const MAX_ENTRIES = 20000;

/** Directory names never listed (build/vendor/git noise). */
const IGNORED_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  ".idea",
  ".vscode",
  ".settings",
  "node_modules",
  "target",
  "build",
  "dist",
  "out",
  ".gradle",
  ".cache",
  ".next",
  ".turbo"
]);

/** File names never listed. */
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db"]);

/**
 * Recursively collect files AND directories under `dir` (relative to `root`),
 * each as `{ path, name, type }`. Ignored directories are skipped entirely
 * (neither listed nor descended). Errors on unreadable directories are
 * swallowed so one permission failure cannot kill the whole listing.
 * Stops collecting at MAX_ENTRIES (the `out` object carries `truncated`).
 */
async function walk(dir, root, out) {
  if (out.entries.length >= MAX_ENTRIES) {
    out.truncated = true;
    return;
  }
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (out.entries.length >= MAX_ENTRIES) {
      out.truncated = true;
      return;
    }
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const rel = relative(root, join(dir, entry.name)).split(sep).join("/");
      out.entries.push({ path: rel, name: entry.name, type: "dir" });
      await walk(join(dir, entry.name), root, out);
    } else if (entry.isFile()) {
      if (IGNORED_FILES.has(entry.name)) continue;
      const rel = relative(root, join(dir, entry.name)).split(sep).join("/");
      out.entries.push({ path: rel, name: entry.name, type: "file" });
    }
  }
}

/**
 * Serve GET/HEAD /file-mention/files.json with
 * `{ root, count, entries: [{ path, name, type }], truncated? }` where `path`
 * is the root-relative posix path and `type` is "file" or "dir". The browser
 * half passes the session's working directory as `?root=` (authoritative for
 * which project the user is in); when absent or non-absolute, the host process
 * cwd is the fallback. no-store: the browser half re-fetches with a
 * cache-buster every time the picker opens, so edits show up promptly.
 */
async function serveFiles(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }
  const rootParam = new URL(req.url ?? "/", "http://x").searchParams.get("root");
  const root = rootParam !== null && isAbsolute(rootParam) ? rootParam : process.cwd();
  const out = { entries: [] };
  await walk(root, root, out);
  out.entries.sort((a, b) => a.path.localeCompare(b.path));
  const body = JSON.stringify({
    root,
    count: out.entries.length,
    entries: out.entries,
    truncated: out.truncated === true
  });
  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

/**
 * Plugin body: mount the files route on the webserver.
 * @param ctx - plugin context carrying the webServer service.
 */
function apply(ctx) {
  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "exact",
        path: "/file-mention/files.json",
        handler: serveFiles
      }),
    "file-mention: files route"
  );
}

export { name, inject, apply, serveFiles, walk };
