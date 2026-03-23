#!/usr/bin/env python3
"""Remove duplicate gallery items from gallery.html, keeping only first occurrence."""

import re

with open('gallery.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all gallery items and their slide numbers
pattern = r'<div class="gallery-item"[^>]*>.*?onclick=["\']openLightbox\(["\']images/reunion/slide_(\d+)\.jpg'
matches = list(re.finditer(pattern, content, re.DOTALL))

# Track which slides we've seen
seen_slides = {}
duplicates_to_remove = []

for match in matches:
    slide_num = int(match.group(1))
    if slide_num in seen_slides:
        # This is a duplicate - mark for removal
        duplicates_to_remove.append(match.start())
    else:
        # First occurrence - keep it
        seen_slides[slide_num] = match.start()

print(f"Total gallery items: {len(matches)}")
print(f"Unique slides: {len(seen_slides)}")
print(f"Duplicate items to remove: {len(duplicates_to_remove)}")

if duplicates_to_remove:
    # Process from end to beginning to avoid offset issues
    for start_pos in sorted(duplicates_to_remove, reverse=True):
        # Find the opening <div class="gallery-item"
        opening = content.rfind('<div class="gallery-item"', 0, start_pos + 1)
        
        # Count nested divs to find the closing </div>
        div_count = 1
        pos = opening + len('<div class="gallery-item"')
        
        while div_count > 0 and pos < len(content):
            if content[pos:pos+5] == '<div ':
                div_count += 1
            elif content[pos:pos+6] == '</div>':
                div_count -= 1
                if div_count == 0:
                    # Remove from opening to closing </div> (inclusive)
                    closing = pos + 6
                    # Also remove trailing newline/whitespace if present
                    if closing < len(content) and content[closing] == '\n':
                        closing += 1
                        # Remove indentation on next line too
                        while closing < len(content) and content[closing] in ' \t':
                            closing += 1
                    
                    content = content[:opening] + content[closing:]
                    break
            pos += 1
    
    with open('gallery.html', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Removed {len(duplicates_to_remove)} duplicate items")
else:
    print("✓ No duplicates found")
