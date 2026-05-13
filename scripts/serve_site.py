"""Static file server for site/dist with SPA-friendly routing.

Next.js `output: "export"` produces .html files like:
    site/dist/index.html
    site/dist/quiz.html
    site/dist/404.html
    site/dist/module/1.html, module/2.html, ...

This server serves them at clean paths:  /, /quiz, /module/1, etc.
"""
from __future__ import annotations

import argparse
import os
import posixpath
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1] / "site" / "dist"


class SiteHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        # Strip query/fragment
        path = path.split("?", 1)[0].split("#", 1)[0]
        # URL-decode (so %5B -> [, %5D -> ], etc.). Critical for Next.js
        # dynamic-route chunks that live under directories like `[id]`.
        path = unquote(path)
        # Normalize
        path = posixpath.normpath(path)
        # Strip leading slash so it joins relative to ROOT
        rel = path.lstrip("/")
        candidate = ROOT / rel if rel else ROOT / "index.html"
        # If the candidate is a directory, look for index.html inside.
        if candidate.is_dir():
            idx = candidate / "index.html"
            if idx.is_file():
                return str(idx)
        # If the file exists, serve it.
        if candidate.is_file():
            return str(candidate)
        # Try `.html` extension fallback for *extensionless* paths only
        # (e.g. /quiz -> quiz.html, /module/1 -> module/1.html). Never apply
        # to requests for static assets like `.js` / `.css` / `.png`.
        if not candidate.suffix:
            html = candidate.parent / (candidate.name + ".html")
            if html.is_file():
                return str(html)
        # Fall back to 404 page only for HTML navigations, never for assets.
        if not candidate.suffix:
            notfound = ROOT / "404.html"
            if notfound.is_file():
                return str(notfound)
        return str(candidate)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:  # type: ignore[override]
        sys.stderr.write("[serve] " + (fmt % args) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=3001)
    ap.add_argument("--host", default="127.0.0.1")
    args = ap.parse_args()

    if not ROOT.exists():
        print(f"FATAL: build directory not found: {ROOT}", file=sys.stderr)
        print("Run `npm --prefix site run build` first.", file=sys.stderr)
        return 1

    os.chdir(ROOT)
    httpd = HTTPServer((args.host, args.port), SiteHandler)
    print(f"serving {ROOT} at http://{args.host}:{args.port}", file=sys.stderr)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
