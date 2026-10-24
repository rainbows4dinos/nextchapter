import json, re
inv = json.load(open('figma-inventory.json'))
css = open('../tools/shared/tokens.css').read()
def block(sel):
    m = re.search(re.escape(sel) + r'\s*\{(.*?)\n\}', css, re.S); return m.group(1)
def decls(txt): return dict(re.findall(r'(--[a-z0-9-]+):\s*([^;]+);', txt))
root = decls(css.split('@media')[0])          # first :root block (primitives, type, space)
dark = decls(block(':root, body'))
light = {**dark, **decls(block('body.light'))}
allroot = {**root, **dark}
def cname(fig):
    if fig.startswith('status/'):
        return '--ds-badge-' + fig.split('/')[1]
    if fig.startswith('font-family/'):
        return '--nc-font-' + fig.split('/')[1]
    if fig.startswith('spacing/'):
        return '--nc-space-' + fig.split('/')[1].replace('_', '-')
    return '--nc-' + fig.replace('/', '-')
def norm(v):
    v = v.strip()
    m = re.match(r'var\((--[a-z0-9-]+)\)$', v)
    if m: return '@' + m.group(1)
    m = re.match(r'rgb\(([\d.]+) ([\d.]+) ([\d.]+)\)$', v)
    if m: return '#' + ''.join('%02x' % round(float(x)) for x in m.groups())
    m = re.match(r'color-mix\(in srgb, var\((--[a-z0-9-]+)\) (\d+)%, transparent\)', v)
    if m: return '@%s %s%%' % m.groups()
    return v.lower().replace('px', '')
def fexp(v):
    if isinstance(v, str) and v.startswith('@'):
        parts = v[1:].split(' ')
        return ' '.join(['@' + cname(parts[0])] + parts[1:])
    return str(v).lower()
rows = []
for col, d in inv['variables'].items():
    for name, val in d['vars'].items():
        cn = cname(name)
        if col == 'Theme':
            cl, cd = light.get(cn, root.get(cn)), dark.get(cn, root.get(cn))
            if cl is None and cd is None: cls = 'missing-in-code'
            else:
                ok = norm(cl or '') == fexp(val[0]) and norm(cd or '') == fexp(val[1])
                cls = 'match' if ok else 'value-drift'
                if not ok: cls += ' (code %s / %s)' % (norm(cl or '-'), norm(cd or '-'))
        else:
            c = allroot.get(cn)
            if col == 'Typography' and name.startswith('font-family/'): cls = 'missing-in-code' if c is None else 'match'
            elif c is None: cls = 'missing-in-code'
            else: cls = 'match' if norm(c) == fexp(val) else 'value-drift (code %s)' % norm(c)
        rows.append((col, name, cn, cls))
json.dump(rows, open('token-rows.json', 'w'))
from collections import Counter
print(Counter((r[0], r[3].split(' ')[0]) for r in rows))
for r in rows:
    if not r[3].startswith('match') and r[0] not in ('Spacing', 'Typography'): print(r)
figma_names = {cname(n) for d in inv['variables'].values() for n in d['vars']}
code_only = sorted(set(allroot) | set(light)) 
print('code-only:', [c for c in code_only if c not in figma_names and not c.startswith('--nc-type-')])
