#!/usr/bin/env python3
"""下载并子集化字体到 src/assets/fonts/（需要 Python fonttools + brotli）。

- 拉丁字体：取 Google Fonts 的 latin 子集，再裁剪到 ASCII + 页面中实际用到的符号。
- Noto Serif SC：只保留 index.html / public/404.html 中出现的汉字与全角标点（几十 KB）。
改了页面里的中文文案之后重新运行：python3 scripts/fetch-fonts.py
"""
import re, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src/assets/fonts'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()

def page_text() -> str:
    text = ''
    for name in ('index.html', 'public/404.html'):
        p = ROOT / name
        if p.exists():
            html = p.read_text('utf-8')
            html = re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>', '', html)
            text += re.sub(r'<[^>]+>', '', html) + ' '.join(re.findall(r'(?:aria-label|alt|content)="([^"]*)"', html))
    return text

def latin_src(css: str, style: str) -> str:
    blocks = re.findall(r'/\* latin \*/\s*@font-face\s*{([^}]*)}', css)
    for b in blocks:
        if f'font-style: {style}' in b:
            return re.search(r'url\((https://[^)]+)\)', b).group(1)
    raise SystemExit(f'latin {style} not found')

def subset(src: Path, dst: Path, unicodes: str = '', text: str = ''):
    args = [sys.executable, '-m', 'fontTools.subset', str(src), f'--output-file={dst}', '--flavor=woff2', '--layout-features=*', '--no-hinting']
    if unicodes: args.append(f'--unicodes={unicodes}')
    if text: args.append(f'--text={text}')
    subprocess.run(args, check=True)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    text = page_text()
    symbols = ''.join(sorted({c for c in text if ord(c) > 0x7e and ord(c) < 0x2e80}))
    latin = 'U+0020-007E,U+00A0,U+00B7,U+00A9,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+2191,U+2197'
    families = [
        ('inter-tight', 'Inter+Tight:wght@300..600', 'normal'),
        ('instrument-serif', 'Instrument+Serif:ital@0', 'normal'),
        ('instrument-serif-italic', 'Instrument+Serif:ital@1', 'italic'),
        ('jetbrains-mono', 'JetBrains+Mono:wght@400..500', 'normal'),
    ]
    tmp = OUT / '_tmp.woff2'
    for name, query, style in families:
        css = get(f'https://fonts.googleapis.com/css2?family={query}&display=swap').decode()
        tmp.write_bytes(get(latin_src(css, style)))
        subset(tmp, OUT / f'{name}.woff2', unicodes=latin, text=symbols)
    cjk = ''.join(sorted({c for c in text if ord(c) >= 0x2e80} | set('，。、：；！？“”‘’（）《》—…·')))
    css = get('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400&text=' + urllib.parse.quote(cjk + 'GitHubAIESP0123456789')).decode()
    url = re.search(r'url\((https://[^)]+)\)', css).group(1)
    tmp.write_bytes(get(url))
    subset(tmp, OUT / 'noto-serif-sc-subset.woff2', text=cjk)
    tmp.unlink()
    # 404 页是不经 Vite 处理的静态文件，复制一份固定文件名的字体给它用
    pub = ROOT / 'public/fonts'
    pub.mkdir(parents=True, exist_ok=True)
    for name in ('inter-tight', 'instrument-serif-italic', 'jetbrains-mono', 'noto-serif-sc-subset'):
        (pub / f'{name}.woff2').write_bytes((OUT / f'{name}.woff2').read_bytes())
    for f in sorted(OUT.glob('*.woff2')):
        print(f'{f.name:32} {f.stat().st_size / 1024:6.1f} KB')
    print(f'CJK glyphs: {len(cjk)}')

if __name__ == '__main__':
    main()
