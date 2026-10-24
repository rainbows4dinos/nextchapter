"""Check every Figma text style in figma-inventory.json against resolved --nc-type-* tokens,
and that each weight is requested by the font URL on every entry page."""
import json, re, sys, importlib.util
spec = importlib.util.spec_from_file_location('rt', 'scripts/resolve-tokens.py')
src = open('scripts/resolve-tokens.py').read().split('b, a = parse')[0]
ns = {}; exec(src, ns)
dark, _ = ns['parse']('../tools/shared/tokens.css')
R = lambda n: ns['resolve'](dark, n)
inv = json.load(open('figma-inventory.json'))
W = {'Light': 300, 'Regular': 400, 'Medium': 500, 'Semi Bold': 600}
pages = ['../tools/about.html', '../tools/career-radar.html', '../tools/resume-tailor.html', '../tools/prospect-tracker/index.html']
def loaded(fam, w):
    out = []
    for p in pages:
        m = re.search(r'fonts.googleapis.com/css2\?([^"]+)', open(p).read()).group(1)
        spec = [x for x in m.split('&') if x.startswith('family=' + fam.replace(' ', '+'))][0]
        ws = re.search(r'wght@([\d;]+)', spec)
        out.append(w in ([int(x) for x in ws.group(1).split(';')] if ws else [400]))
    return all(out)
bad = 0
for name, (fam, sty, size, lh) in inv['textStyles'].items():
    k = '--nc-type-' + name.replace('Type/', '').replace('Heading/', '').replace('Button Sm', 'button-small').lower().replace('/', '-').replace(' ', '-')
    got = (R(k + '-size'), R(k + '-line-height'), R(k + '-weight'))
    want = ('%dpx' % size, '%dpx' % lh, str(W[sty]))
    ok = got == want and loaded(fam, W[sty])
    bad += not ok
    print(('ok  ' if ok else 'BAD ') + name, got if not ok else '', '' if loaded(fam, W[sty]) else '(weight not loaded)')
sys.exit(1 if bad else 0)
