#!/usr/bin/env python3
"""
Local development server for the Fortney Family Heritage website.
Run from the family-tree directory: python serve.py
Then open http://localhost:8000 in your browser.
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import threading

PORT = 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    """Serve files with correct MIME types and CORS headers for local dev."""

    def end_headers(self):
        # Allow local fetch() calls (needed for D3 tree and timeline JSON)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        # Cleaner output: skip favicon noise
        if '404' in str(args) and 'favicon' in str(args):
            return
        print(f"  {self.address_string()} — {format % args}")


def open_browser(port):
    """Open the browser after a short delay to let the server start."""
    import time
    time.sleep(0.5)
    webbrowser.open(f'http://localhost:{port}')


if __name__ == '__main__':
    # Change to the script's directory so paths resolve correctly
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Allow overriding port via command line: python serve.py 8080
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port '{sys.argv[1]}', using {PORT}")

    try:
        with socketserver.TCPServer(('', PORT), Handler) as httpd:
            print(f"\n  Fortney Family Heritage — Local Server")
            print(f"  ─────────────────────────────────────")
            print(f"  Serving from: {script_dir}")
            print(f"  URL:          http://localhost:{PORT}")
            print(f"\n  Press Ctrl+C to stop.\n")

            # Open browser automatically
            threading.Thread(target=open_browser, args=(PORT,), daemon=True).start()

            httpd.serve_forever()

    except OSError as e:
        if 'Address already in use' in str(e):
            print(f"\n  Port {PORT} is already in use.")
            print(f"  Try: python serve.py {PORT + 1}\n")
        else:
            print(f"\n  Error: {e}\n")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n  Server stopped.\n")
