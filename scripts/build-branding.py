from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
import shutil

branding_dir = os.path.abspath('resources/branding')
os.makedirs(branding_dir, exist_ok=True)

# 1. Master Canvas 1024x1024
size = 1024

# Background gradient (top #152f23 to bottom #0c1b14)
grad = Image.new('RGBA', (size, size))
for y in range(size):
    factor = y / float(size)
    r = int(21 * (1 - factor) + 12 * factor)
    g = int(47 * (1 - factor) + 27 * factor)
    b = int(35 * (1 - factor) + 20 * factor)
    for x in range(size):
        grad.putpixel((x, y), (r, g, b, 255))

# Mask with squircle (radius 220)
mask = Image.new('L', (size, size), 0)
mask_draw = ImageDraw.Draw(mask)
mask_draw.rounded_rectangle([32, 32, size-32, size-32], radius=220, fill=255)

bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
bg.paste(grad, (0, 0), mask)

draw = ImageDraw.Draw(bg)
# Subtle inner border
draw.rounded_rectangle([40, 40, size-40, size-40], radius=212, outline=(42, 77, 60, 180), width=8)

# Load font
font = ImageFont.truetype(r'C:\Windows\Fonts\tahomabd.ttf', 560)
bbox = draw.textbbox((0, 0), 'م', font=font)
w = bbox[2] - bbox[0]
h = bbox[3] - bbox[1]

x = (size - w) / 2 - bbox[0]
y = (size - h) / 2 - bbox[1] - 12

# Glow layer
glow_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)
glow_draw.text((x, y), 'م', font=font, fill=(197, 166, 100, 110))
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=28))

# Text layer (gold)
text_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
text_draw = ImageDraw.Draw(text_layer)
text_draw.text((x, y), 'م', font=font, fill=(208, 178, 114, 255))

# Combine for complete icon
final_icon = Image.alpha_composite(bg, glow_layer)
final_icon = Image.alpha_composite(final_icon, text_layer)

# Standalone mark (transparent background for splash)
mark_img = Image.alpha_composite(glow_layer, text_layer)

# Crop mark using exact alpha bounding box with small padding
alpha_bbox = mark_img.getbbox()
padding = 24
cropped_box = (
    max(0, alpha_bbox[0] - padding),
    max(0, alpha_bbox[1] - padding),
    min(size, alpha_bbox[2] + padding),
    min(size, alpha_bbox[3] + padding)
)
mark_cropped = mark_img.crop(cropped_box)
mw, mh = mark_cropped.size
# Place in square canvas
max_dim = max(mw, mh)
mark_sq = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
mark_sq.paste(mark_cropped, ((max_dim - mw) // 2, (max_dim - mh) // 2))
mark_256 = mark_sq.resize((256, 256), Image.Resampling.LANCZOS)
mark_256.save(os.path.join(branding_dir, 'maktoob-mark-256.png'))

# Save PNG sizes
sizes = [512, 256, 128, 64, 48, 32, 24, 16]
ico_images = []
for s in sizes:
    resized = final_icon.resize((s, s), Image.Resampling.LANCZOS)
    resized.save(os.path.join(branding_dir, f'maktoob-icon-{s}.png'))
    if s <= 256:
        ico_images.append(resized)

# Save multi-resolution ICO file
ico_path = os.path.join(branding_dir, 'maktoob.ico')
# Pillow save ICO with multiple sizes
# Sort largest to smallest for ICO
ico_images.sort(key=lambda im: im.size[0], reverse=True)
ico_images[0].save(
    ico_path,
    format='ICO',
    sizes=[(im.size[0], im.size[1]) for im in ico_images]
)
# Also copy to resources/icon.ico for electron-builder default
shutil.copyfile(ico_path, os.path.abspath('resources/icon.ico'))

# Generate master vector SVG for branding
svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="maktoob-bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#152f23"/>
      <stop offset="100%" stop-color="#0c1b14"/>
    </linearGradient>
    <linearGradient id="maktoob-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ddbe7c"/>
      <stop offset="100%" stop-color="#b8954e"/>
    </linearGradient>
    <filter id="maktoob-ambient" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <!-- Squircle Base -->
  <rect width="512" height="512" rx="112" ry="112" fill="url(#maktoob-bg)"/>
  <rect x="16" y="16" width="480" height="480" rx="98" ry="98" fill="none" stroke="#274637" stroke-width="4" opacity="0.7"/>
  <path d="M 120 18 L 392 18 C 450 18 480 48 488 100" stroke="rgba(255,255,255,0.08)" stroke-width="3" stroke-linecap="round"/>
  <!-- Arabic Meem Mark -->
  <g filter="url(#maktoob-ambient)">
    <text x="50%" y="51%" dominant-baseline="central" text-anchor="middle" font-family="'Segoe UI', Tahoma, sans-serif" font-weight="bold" font-size="280" fill="url(#maktoob-gold)">م</text>
  </g>
</svg>
'''
with open(os.path.join(branding_dir, 'maktoob-icon.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_content)

svg_mark = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mark-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ddbe7c"/>
      <stop offset="100%" stop-color="#b8954e"/>
    </linearGradient>
    <filter id="mark-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <g filter="url(#mark-glow)">
    <text x="50%" y="52%" dominant-baseline="central" text-anchor="middle" font-family="'Segoe UI', Tahoma, sans-serif" font-weight="bold" font-size="160" fill="url(#mark-gold)">م</text>
  </g>
</svg>
'''
with open(os.path.join(branding_dir, 'maktoob-mark.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_mark)

# Remove test scratch files if present
for test_file in ['test-icon.png', 'test-refined-256.png', 'test-refined-32.png', 'test-render.png']:
    p = os.path.join(branding_dir, test_file)
    if os.path.exists(p):
        os.remove(p)

print('BRANDING_BUILD_SUCCESS')
