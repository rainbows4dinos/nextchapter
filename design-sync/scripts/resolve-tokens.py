"""Resolve every --nc-*/--ds-* token to its final value in dark and light contexts.
Usage: python3 resolve-tokens.py BEFORE.css AFTER.css  -> lists tokens whose resolved value changed."""
import re, sys
def parse(path):
    css = re.sub(r'/\*.*?\*/', '', open(path).read(), flags=re.S)
    css = re.sub(r'@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', '', css)  # ignore reduced-motion overrides
    blocks = re.findall(r'([^{}]+)\{([^{}]*)\}', css)
    dark, light = {}, {}
    for sel, body in blocks:
        d = dict(re.findall(r'(--[a-z0-9-]+):\s*([^;]+);', body))
        sel = sel.strip()
        if sel in (':root', ':root, body'): dark.update(d); light.update(d)
        if sel == 'body.light': light.update(d)
    return dark, light
def resolve(env, name, depth=0):
    v = env.get(name)
    if v is None or depth > 20: return None
    return re.sub(r'var\((--[a-z0-9-]+)\)', lambda m: resolve(env, m.group(1), depth + 1) or m.group(0), v).strip()
b, a = parse(sys.argv[1]), parse(sys.argv[2])
changed, added = [], []
for mode, (be, ae) in zip(('dark', 'light'), zip(b, a)):
    for n in be:
        rb, ra = resolve(be, n), resolve(ae, n)
        if rb != ra: changed.append((mode, n, rb, ra))
    added += [n for n in ae if n not in be and mode == 'dark']
print('tokens before:', len(b[0]), 'after:', len(a[0]), 'added:', len(added))
print('resolved value changes:', changed or 'none')
