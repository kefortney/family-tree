#!/usr/bin/env python3
"""
Crop whitespace from reunion images.

This script automatically detects and removes unnecessary whitespace
from all images in the images/reunion/ folder.

Usage:
    python crop_whitespace.py
    python crop_whitespace.py --threshold 240  # Set whiteness threshold (0-255)
    python crop_whitespace.py --backup         # Create backups before modifying
"""

import os
import sys
import argparse
from pathlib import Path
from PIL import Image
import traceback


def get_bounding_box(img, threshold=240):
    """
    Find the bounding box of non-white content.
    
    Args:
        img: PIL Image object
        threshold: Pixel value above which is considered "white" (0-255)
        
    Returns:
        (left, top, right, bottom) or None if image is all white
    """
    # Convert to RGB if it has alpha channel
    if img.mode == 'RGBA':
        img_rgb = Image.new('RGB', img.size, (255, 255, 255))
        img_rgb.paste(img, mask=img.split()[3])
        img = img_rgb
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Get pixel data
    pixels = img.load()
    width, height = img.size
    
    # Find bounds
    left = width
    top = height
    right = 0
    bottom = 0
    
    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y][:3] if len(pixels[x, y]) >= 3 else pixels[x, y]
            # Check if pixel is not close to white
            if r < threshold or g < threshold or b < threshold:
                left = min(left, x)
                top = min(top, y)
                right = max(right, x)
                bottom = max(bottom, y)
    
    # Add small padding (5px)
    padding = 5
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(width, right + padding)
    bottom = min(height, bottom + padding)
    
    if left >= right or top >= bottom:
        return None
    
    return (left, top, right, bottom)


def crop_image(image_path, threshold=240, backup=False):
    """
    Crop whitespace from an image.
    
    Args:
        image_path: Path to image file
        threshold: Whiteness threshold
        backup: Whether to create a backup
        
    Returns:
        (success, message)
    """
    try:
        img = Image.open(image_path)
        original_size = img.size
        
        bbox = get_bounding_box(img, threshold)
        
        if bbox is None:
            return (False, f"Image is entirely white (skipped)")
        
        left, top, right, bottom = bbox
        new_width = right - left
        new_height = bottom - top
        
        # Check if cropping would actually change anything
        if new_width == original_size[0] and new_height == original_size[1]:
            return (False, f"No whitespace to crop (same size)")
        
        # Create backup if requested
        if backup:
            backup_path = image_path + ".bak"
            if not os.path.exists(backup_path):
                import shutil
                shutil.copy2(image_path, backup_path)
        
        # Crop and save
        cropped = img.crop(bbox)
        cropped.save(image_path, quality=95)
        
        reduction_pct = 100 * (1 - (new_width * new_height) / (original_size[0] * original_size[1]))
        return (True, f"Cropped from {original_size[0]}×{original_size[1]} to {new_width}×{new_height} ({reduction_pct:.1f}% smaller)")
        
    except Exception as e:
        return (False, f"Error: {str(e)}")


def main():
    parser = argparse.ArgumentParser(
        description='Crop whitespace from reunion images',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python crop_whitespace.py
  python crop_whitespace.py --threshold 235
  python crop_whitespace.py --backup
        """
    )
    parser.add_argument('--threshold', type=int, default=240,
                       help='Whiteness threshold (0-255, default: 240)')
    parser.add_argument('--backup', action='store_true',
                       help='Create backups of original images')
    args = parser.parse_args()
    
    script_dir = Path(__file__).parent
    images_dir = script_dir / 'images' / 'reunion'
    
    if not images_dir.exists():
        print(f"Error: Directory not found: {images_dir}")
        return 1
    
    # Find all JPG files
    image_files = sorted(images_dir.glob('slide_*.jpg'))
    
    if not image_files:
        print(f"No images found in {images_dir}")
        return 1
    
    print(f"Found {len(image_files)} images in {images_dir}")
    print(f"Using whiteness threshold: {args.threshold}")
    if args.backup:
        print("Creating backups...")
    print()
    
    cropped_count = 0
    errors = []
    
    for i, img_path in enumerate(image_files, 1):
        filename = img_path.name
        success, message = crop_image(str(img_path), args.threshold, args.backup)
        
        status = "✓" if success else "–"
        print(f"[{i:3d}/{len(image_files)}] {status} {filename}: {message}")
        
        if success:
            cropped_count += 1
        elif "Error:" in message:
            errors.append(f"{filename}: {message}")
    
    print()
    print(f"Completed: {cropped_count}/{len(image_files)} images cropped")
    
    if errors:
        print("\nErrors encountered:")
        for error in errors:
            print(f"  - {error}")
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
