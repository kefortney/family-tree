#!/usr/bin/env python3
"""
Extract images from the Fortney Centennial Reunion 2007 Keynote/PDF.

For each slide:
  - If the slide contains embedded image objects: save each as slide_NNN_1.jpg, slide_NNN_2.jpg, …
  - If no embedded images (text/chart slide): render the full page as slide_NNN.jpg

Output goes to: family-tree/images/reunion/

Usage:
    python extract_slides.py
    python extract_slides.py --render-all    # render every page as full image (fastest)
    python extract_slides.py --dpi 150       # set render DPI (default 150)
"""

import fitz  # PyMuPDF
import os
import sys
import argparse

# ── Configuration ──────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PDF_PATH     = os.path.join(
    SCRIPT_DIR, '..', 'alan-jon-fortney', 'Genealogy',
    'Fortney Centenial Reunion 2007 TIMED.key.pdf'
)
OUTPUT_DIR   = os.path.join(SCRIPT_DIR, 'images', 'reunion')
DEFAULT_DPI  = 150      # 150 dpi → good quality, ~800–1200px wide per slide
MIN_IMG_SIZE = 5000     # bytes — skip tiny icons/logos


def extract_embedded(page, page_num, out_dir, img_count):
    """Extract all embedded image objects from a page. Returns number extracted."""
    extracted = 0
    for img_info in page.get_images(full=True):
        xref = img_info[0]
        try:
            img_data = page.parent.extract_image(xref)
        except Exception:
            continue

        ext   = img_data.get('ext', 'jpg')
        data  = img_data['image']

        if len(data) < MIN_IMG_SIZE:
            continue  # skip tiny decorative graphics

        img_count += 1
        extracted  += 1
        filename = f"slide_{page_num:03d}_{extracted}.{ext}"

        # Normalise to jpg for consistency
        if ext.lower() not in ('jpg', 'jpeg'):
            try:
                import io
                from PIL import Image
                img_obj = Image.open(io.BytesIO(data))
                if img_obj.mode in ('RGBA', 'P'):
                    img_obj = img_obj.convert('RGB')
                filename = f"slide_{page_num:03d}_{extracted}.jpg"
                img_obj.save(os.path.join(out_dir, filename), 'JPEG', quality=92)
                print(f"    ✓ {filename}  (converted from {ext})")
                continue
            except Exception:
                pass  # fall through to raw save

        out_path = os.path.join(out_dir, filename)
        with open(out_path, 'wb') as f:
            f.write(data)
        print(f"    ✓ {filename}")

    return extracted


def render_page(page, page_num, out_dir, dpi):
    """Render an entire slide as a JPEG image."""
    mat      = fitz.Matrix(dpi / 72, dpi / 72)
    pix      = page.get_pixmap(matrix=mat, alpha=False)
    filename = f"slide_{page_num:03d}.jpg"
    out_path = os.path.join(out_dir, filename)
    pix.save(out_path)
    print(f"    ✓ {filename}  (full render, {pix.width}×{pix.height}px)")


def main():
    parser = argparse.ArgumentParser(description='Extract slides from Centennial Reunion PDF')
    parser.add_argument('--render-all', action='store_true',
                        help='Render every page as a full image (ignores embedded objects)')
    parser.add_argument('--dpi', type=int, default=DEFAULT_DPI,
                        help=f'Render DPI for full-page rendering (default {DEFAULT_DPI})')
    parser.add_argument('--pdf', default=PDF_PATH,
                        help='Path to the PDF file')
    parser.add_argument('--out', default=OUTPUT_DIR,
                        help='Output directory')
    args = parser.parse_args()

    pdf_path = os.path.abspath(args.pdf)
    out_dir  = os.path.abspath(args.out)

    # Check PDF exists
    if not os.path.isfile(pdf_path):
        print(f"\n  ✗ PDF not found: {pdf_path}")
        print(f"\n  Looking for: {os.path.basename(pdf_path)}")
        print(f"  In:          {os.path.dirname(pdf_path)}")
        print("\n  Options:")
        print("  1. Run from the family-tree directory.")
        print("  2. Pass the path explicitly: python extract_slides.py --pdf /path/to/file.pdf\n")
        sys.exit(1)

    os.makedirs(out_dir, exist_ok=True)

    file_size_mb = os.path.getsize(pdf_path) / 1024 / 1024
    print(f"\n  Fortney Centennial Reunion — Slide Extractor")
    print(f"  ─────────────────────────────────────────────")
    print(f"  PDF:    {os.path.basename(pdf_path)}  ({file_size_mb:.0f} MB)")
    print(f"  Output: {out_dir}")
    print(f"  Mode:   {'Full page render' if args.render_all else 'Extract embedded images (+ render fallback)'}")
    print(f"  DPI:    {args.dpi}\n")

    doc = fitz.open(pdf_path)
    total_pages = len(doc)
    total_images = 0
    skipped = 0

    print(f"  Processing {total_pages} slides…\n")

    for page_num in range(1, total_pages + 1):
        page = doc[page_num - 1]
        print(f"  Slide {page_num:03d}/{total_pages}", end='')

        # Check if output already exists — skip if so
        existing = [
            f for f in os.listdir(out_dir)
            if f.startswith(f"slide_{page_num:03d}")
        ]
        if existing:
            print(f"  (already extracted, skipping)")
            skipped += 1
            continue

        print()  # newline before listing files

        if args.render_all:
            render_page(page, page_num, out_dir, args.dpi)
            total_images += 1
        else:
            extracted = extract_embedded(page, page_num, out_dir, total_images)
            if extracted == 0:
                # No usable embedded images — render the full page
                render_page(page, page_num, out_dir, args.dpi)
                total_images += 1
            else:
                total_images += extracted

    doc.close()

    print(f"\n  ─────────────────────────────────────────────")
    print(f"  Done.  {total_images} images saved to images/reunion/")
    if skipped:
        print(f"         {skipped} slides skipped (already extracted)")
    print(f"\n  Open http://localhost:8000/gallery.html to see the gallery.\n")


if __name__ == '__main__':
    main()
