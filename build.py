"""Bitta mustaqil HTML fayl yaratadi (serversiz ko'rish uchun).
Rasmlar, videolar va JS faylning ichiga joylanadi. Ishlatish: python3 build.py"""
import base64, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, 'public')
MIME = {'jpg': 'image/jpeg', 'png': 'image/png', 'svg': 'image/svg+xml', 'mp4': 'video/mp4'}

s = open(os.path.join(PUB, 'index.html'), encoding='utf-8').read()
SCRIPT = re.compile(r'<script\b[^>]*\bsrc="js/([\w.]+\.js)(?:\?v=\w+)?"[^>]*>\s*</script>')
s = SCRIPT.sub(lambda m: '<script>\n' + open(os.path.join(PUB, 'js', m.group(1)), encoding='utf-8').read() + '\n</script>', s)
for ref in sorted(set(re.findall(r'assets/[\w\-./]+\.(?:jpg|png|svg|mp4)', s))):
    data = base64.b64encode(open(os.path.join(PUB, ref), 'rb').read()).decode()
    s = s.replace(ref, f'data:{MIME[ref.rsplit(".", 1)[1]]};base64,{data}')
out = os.path.join(ROOT, 'zafar-school.html')
open(out, 'w', encoding='utf-8').write(s)
print(f'{out}: {os.path.getsize(out) / 1e6:.2f} MB')
