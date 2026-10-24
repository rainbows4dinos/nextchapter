import json, re
import os, sys
if os.path.exists('ledger.json') and '--force' not in sys.argv:
    sys.exit('ledger.json exists. Rebuilding resets every status. Re-run with --force only for a fresh audit.')
inv = json.load(open('figma-inventory.json')); rows = json.load(open('token-rows.json'))
css = open('../tools/shared/tokens.css').read()
FK = inv['fileKey']
def link(node): return 'https://www.figma.com/design/%s/nextchapter?node-id=%s' % (FK, node.replace(':', '-'))

# ---------- config
config = {
  "figma": {"fileKey": FK, "libraryPages": {"foundations": "45:3", "components": "92:5175", "icons": "45:2384"}},
  "direction": "figma-to-code",
  "code": {"tokens": "tools/shared/tokens.css", "components": ["tools/shared/components.css", "tools/shared/navigation.css", "tools/prospect-tracker/styles.css"],
           "markup": ["tools/shared/*.mjs", "tools/prospect-tracker/ui.js", "tools/prospect-tracker/kanban.js"], "framework": "vanilla HTML, CSS, ES modules (BEM classes, no component framework)",
           "preview": "entry pages tools/resume-tailor.html, tools/prospect-tracker/index.html, tools/career-radar.html, tools/about.html served over local HTTP"},
  "conventions": {
    "tokenNaming": "figma a/b/c -> --nc-a-b-c",
    "namingExceptions": {"status/<tone>-<bg|fg>": "--ds-badge-<tone>-<bg|fg> (public Status-Badge contract)", "spacing/X_Y": "--nc-space-X-Y", "font-family/<x>": "--nc-font-<x>", "Type/UI/Button Sm": "--nc-type-ui-button-small-*"},
    "modes": {"Dark": ":root, body (default)", "Light": "body.light"},
    "units": "px", "typography": "per-property custom properties --nc-type-<style>-family|size|line-height|weight",
    "subsetRule": "tokens.css: 'Figma Spacing/Radius subsets in use; add steps only when a consumer needs them'",
    "aliasWithOpacity": "color-mix(in srgb, var(--token) N%, transparent)"
  },
  "batchSize": 3, "mirror": True,
  "mirrorTarget": {"page": "Sync status", "frame": "Design sync ledger"},
  "ownership": {"focusRing": "code keeps 2px offset (docs/shared-design-tokens.md, Oct 20)", "--ds-badge-*": "code-owned public name for Figma status/*"}
}
json.dump(config, open('config.json', 'w'), indent=2)

# ---------- component map
C = [
 ("Load Spinner","81:1063","e491e27534c9a908db7cfe27959b6aca19830505",".nc-spinner","tools/shared/components.css",[],"code"),
 ("Status-Badge","134:13529","22f01488681a7a190dd9ec6f9106ec2e1b069f1e",".nc-status-badge","tools/shared/components.css, tools/shared/status.mjs",[],"code"),
 ("Avatar Badge","205:665","b3599cd89500b3bd53ba31b7bf1cf28de0e7c297",None,None,[],"figmaOnly"),
 ("Input Label","168:610","2315114a449c62dfec3cb2c869c489f520eb2495",".nc-field__label",".nc-field__required in tools/shared/components.css",[],"code"),
 ("Pill Tab Item","92:5012","3c7e74d967d29ba8ba08d53859a088361a191220",".nc-pill-tab","tools/shared/components.css",[],"code"),
 ("Step Progress Item","77:137","b01c2716bd3cb18dfddc7b3b101dc2de078c854c",".nc-step","tools/shared/components.css",[],"code"),
 ("Chip","62:285","2ff8b61dfc46f5b5e60f3a90aa96df6c9ffaa28e",".nc-chip","tools/shared/components.css",[],"code"),
 ("Button","53:220","2b06b5c751a6f665a18d1b509b372fc30efae272",".nc-button","tools/shared/components.css",[],"code"),
 ("Switch-Mode","81:397","1e413bf9bcfaa9851444abc2f4bf48dff64bab3b",".theme-toggle","tools/shared/navigation.css, tools/shared/navigation.mjs",[],"code"),
 ("MainNavItem","92:9731","ee4dca8bc16570257c427fea02badced2687f697",".nextchapter-nav-item","tools/shared/navigation.css",[],"code"),
 ("Company Avatar","206:18776","1596b1723892067efe77680a2df8ea0312533982",None,None,[],"figmaOnly"),
 ("Avatar","205:679","ccddebe1a923847671677ac9a72ea5f0a113d563",None,None,["Avatar Badge"],"figmaOnly"),
 ("Paddle Button","216:20314","bd03d5326e5517c6b005e040c5166fe4b698e872",None,None,["Button"],"figmaOnly"),
 ("Pill-Tabs","279:1161","e586f26806eee9de3467288e4701c5ee8cbda506",".nc-pill-tabs","tools/shared/components.css",["Pill Tab Item"],"code"),
 ("Step Progress Indicator","102:11781","7ae4c1ac44be80afc5c63e9d6b95b5126171f1da",".nc-step-progress","tools/shared/components.css",["Step Progress Item"],"code"),
 ("TextField","53:589","ae024ad4f4aa7c00667f3dbea471926a489200b2",".nc-field .nc-input","tools/shared/components.css, tools/shared/fields.mjs",["Input Label"],"code"),
 ("TextArea","61:183","6a8c718cf1b0e1a9f926b3f8c8d0d2f51132a2dc",".nc-field .nc-textarea","tools/shared/components.css, tools/shared/fields.mjs",["Input Label"],"code"),
 ("Select","92:9223","96bf62d2c19a4f5b9d6c7edd78db4c82af000bdf",".nc-select-wrap .nc-select","tools/shared/components.css, tools/shared/fields.mjs",["Input Label"],"code"),
 ("Checkbox","165:590","cea7eb9ded91159edeeae57ae7473a10ebe7d0ca",".nc-checkbox","tools/shared/components.css",["Input Label"],"code"),
 ("Radio","165:618","223b06d1282a84abd1677497f057882912b51558",".nc-radio","tools/shared/components.css",["Input Label"],"code"),
 ("Alert","53:638","dec09a3bce59688253960ea8e7766f91da651a5d",".nc-alert","tools/shared/components.css",[],"code"),
 ("Toast","125:11817","adb21d999c908a6abb35c07cff4070826bab521c",".nc-toast","tools/shared/components.css, tools/shared/notifications.mjs",[],"code"),
 ("Prospect Card","216:20442","f8081ee2db083bd610072aa20a19be9a95183415",".prospect-card","tools/prospect-tracker/styles.css, tools/prospect-tracker/kanban.js",["Company Avatar","Status-Badge"],"code"),
 ("Main Navigation Header","125:12294","5e5c7aed0194793713e8cf361fc8eccb7209f845",".nextchapter-header","tools/shared/navigation.css, tools/shared/navigation.mjs",["MainNavItem","Switch-Mode","Button"],"code"),
]
props = {
 "Button": {"Variant": {"modifier": {"Primary": "--primary", "Secondary": "--secondary", "Tertiary": "--tertiary"}}, "Size": {"modifier": {"Lg": "--lg", "Sm": "--sm"}}, "State": {"modifier": None, "note": "Hover/Pressed -> :hover/:active, Disabled -> :disabled"}, "Icon Only": {"modifier": None, "note": "no code equivalent yet"}, "Show Icon L": {"modifier": None, "note": "presence of leading icon element"}, "Show Icon R": {"modifier": None, "note": "presence of trailing icon element"}, "Label": {"modifier": None, "note": "text content"}},
 "Chip": {"Size": {"modifier": {"Sm": "--sm", "Lg": "--lg"}}, "State": {"modifier": {"Selected": "--selected"}, "note": "Hover -> :hover"}},
 "Alert": {"Variant": {"modifier": {"Success": "--success", "Danger": "--danger", "Warning": "--warning", "Info": "--info"}}},
 "Toast": {"Variant": {"modifier": {"Success": "--success", "Danger": "--danger", "Warning": "--warning", "Info": "--info"}}, "Show Close": {"modifier": None, "note": "presence of .nc-toast__dismiss"}},
 "Status-Badge": {"Tone": {"modifier": {t: "--" + t for t in ["accent", "active", "positive", "negative", "highlight", "neutral"]}}},
 "Step Progress Item": {"State": {"modifier": {"Active": "--active", "Completed": "--completed", "Upcoming": None}}, "Size": {"modifier": None, "note": "no size modifier in code"}},
 "Checkbox": {"Size": {"modifier": {"Sm": "--sm", "Lg": None}}, "State": {"modifier": None, "note": "native :checked, :indeterminate, :disabled, :hover"}},
 "Radio": {"Size": {"modifier": {"Sm": "--sm", "Lg": None}}, "State": {"modifier": None, "note": "native :checked, :disabled, :hover"}},
 "Pill-Tabs": {"Size": {"modifier": None, "note": "no size modifier in code"}},
 "Pill Tab Item": {"Size": {"modifier": None, "note": "no size modifier in code"}, "State": {"modifier": None, "note": "selected via aria-selected/aria-pressed, check markup"}},
}
cm = {"figmaFileKey": FK, "note": "Vanilla CSS: 'code.selector' is the BEM block; props map Figma properties to modifier classes or native states.", "components": [], "unmatched": {"figmaOnly": [], "codeOnly": [".nc-menu-elevation", ".nc-toast-stack", ".nc-visually-hidden", ".nextchapter-menu-toggle", ".nextchapter-wordmark", ".nextchapter-account-links"]}}
for name, nid, key, sel, path, deps, kind in C:
    if kind == "figmaOnly":
        cm["unmatched"]["figmaOnly"].append({"name": name, "key": key, "nodeId": nid}); continue
    cm["components"].append({"figma": {"name": name, "key": key, "nodeId": nid}, "code": {"selector": sel, "path": path}, "props": props.get(name, {}), "dependsOn": deps, "mapping": "proposed, confirm"})
json.dump(cm, open('component-map.json', 'w'), indent=2)

# ---------- ledger rows
L = []
def add(cat, item, fref, cref, cls, status, notes=""):
    L.append(dict(cat=cat, item=item, fref=fref, cref=cref, cls=cls, status=status, notes=notes))
groups = {}
for col, name, cn, cls in rows:
    if col in ('Primitives', 'Theme'): g = (col, name.rsplit('/', 1)[0] if col == 'Theme' and name.count('/') == 2 else name.split('/')[0])
    else: g = (col, name.split('/')[0])
    groups.setdefault(g, []).append((name, cn, cls))
for (col, g), items in groups.items():
    if col in ('Spacing', 'Radius', 'Typography'): continue
    bad = [i for i in items if not i[2].startswith('match')]
    if not bad:
        add('Variables', '%s %s/* (%d)' % (col, g, len(items)), col, 'tokens.css', 'match', 'synced', '--ds-badge-* names (code-owned contract)' if g == 'status' else '')
    else:
        add('Variables', '%s %s/* (%d)' % (col, g, len(items)), col, 'tokens.css', 'value-drift', 'pending',
            '; '.join('%s: Figma aliases neutral/50 and neutral/900 directly, code aliases --nc-surface-raised. Same resolved color; alias chain differs.' % i[0] for i in bad))
sp = groups[('Spacing', 'spacing')]
have = [i for i in sp if i[2] == 'match']; miss = [i for i in sp if i[2] != 'match']
add('Variables', 'Spacing in use (%d)' % len(have), 'Spacing', 'tokens.css', 'match', 'synced', ', '.join(i[0].split('/')[1] for i in have))
add('Variables', 'Spacing not in code (%d)' % len(miss), 'Spacing', 'tokens.css', 'missing-in-code', 'skipped', 'Code adds steps only when a consumer needs them (tokens.css comment). Confirm or sync full scale.')
rd = groups[('Radius', 'radius')]
add('Variables', 'Radius in use (%d)' % sum(i[2] == 'match' for i in rd), 'Radius', 'tokens.css', 'match', 'synced', '--nc-radius-panel is a code-only alias of xl')
add('Variables', 'Radius not in code (3)', 'Radius', 'tokens.css', 'missing-in-code', 'skipped', 'none, lg, 3xl. Same subset rule. lg duplicates default (8).')
ty = [i for k, v in groups.items() if k[0] == 'Typography' for i in v]
add('Variables', 'Typography font-family (3)', 'Typography', '--nc-font-*', 'match', 'synced', 'named --nc-font-serif|sans|mono')
add('Variables', 'Typography size, line height, weight (21)', 'Typography', 'none', 'missing-in-code', 'needs-decision',
    'All 17 text styles bind these variables, but code text tokens use raw px. Add --nc-font-size-*, --nc-line-height-*, --nc-font-weight-* and point --nc-type-* at them? font-size/6xl (67) and line-height/20 (80) are unused by any style.')
# text styles
code = dict(re.findall(r'(--nc-type-[a-z0-9-]+):\s*([^;]+);', css))
W = {"Regular": 400, "Light": 300, "Medium": 500, "Semi Bold": 600}
loaded = {"Inter": {400, 500, 600}, "DM Serif Display": {400}, "IBM Plex Mono": {400}}
def pref(n):
    n = n.replace('Type/', '').replace('Heading/', '').replace('Button Sm', 'button-small')
    return '--nc-type-' + n.lower().replace('/', '-').replace(' ', '-')
for n, (fam, sty, size, lh) in inv['textStyles'].items():
    p = pref(n)
    got = (code.get(p + '-size'), code.get(p + '-line-height'), code.get(p + '-weight'))
    want = ('%dpx' % size, '%dpx' % lh, str(W[sty]))
    if got != want:
        add('Text styles', n, 'text style', p + '-*', 'value-drift', 'pending', 'code %s, Figma %s' % (got, want)); continue
    if W[sty] not in loaded[fam]:
        add('Text styles', n, 'text style', p + '-*', 'match', 'blocked', '%s %s (%d) is not loaded: Google Fonts URL requests Inter 400;500;600 and default-weight Plex Mono, so the browser falls back to 400. Add wght 300 to the font URL on all 4 entry pages.' % (fam, sty, W[sty]))
    else:
        add('Text styles', n, 'text style', p + '-*', 'match', 'synced', 'values match; raw px, see Typography row')
add('Effect styles', 'shadow/sm', 'effect style', '--nc-shadow-sm', 'match', 'synced', '1px 1px 0 var(--nc-border-control); color binding preserved')
# components
hyg = {"Paddle Button": "gap x2 (215:20115)", "Chip": "padding x6 (62:284)", "Pill-Tabs": "padding x2, radius x2 (279:1160)", "Switch-Mode": "radius x4 (81:395)", "MainNavItem": "padding x3 (92:9729)", "Main Navigation Header": "gap x8, padding x2, radius x3 (92:3396)", "Input Label": "gap x2 (53:501)"}
drift_hint = {"Button": "Figma has Icon Only variant; code has no icon-only modifier", "Pill-Tabs": "Figma Size Sm/Lg; code has no size modifier", "Pill Tab Item": "Figma Size Sm/Lg; code has no size modifier", "Step Progress Item": "Figma Size Lg/Sm; code has no size modifier", "Step Progress Indicator": "Figma Size Lg/Sm; code has no size modifier", "Prospect Card": "Figma nests Company Avatar; no avatar in code", "Checkbox": "implemented Oct 20 per docs", "Radio": "implemented Oct 20 per docs"}
for name, nid, key, sel, path, deps, kind in C:
    if kind == 'figmaOnly':
        add('Components', name, nid, 'none', 'missing-in-code', 'needs-decision', 'Build in code or skip?' + (' Used by Prospect Card.' if name == 'Company Avatar' else ''))
    else:
        n = drift_hint.get(name, '')
        if name in hyg: n = (n + '. ' if n else '') + 'Has Figma hygiene items, see H rows'
        add('Components', name, nid, sel, 'structure-drift', 'pending', n)
for name, issue in hyg.items():
    nid = [c[1] for c in C if c[0] == name][0]
    add('Figma hygiene', name, nid, '-', 'hygiene', 'needs-figma-fix', 'Unbound values: ' + issue + '. Bind to Spacing/Radius variables.')
pfx = {'Variables': 'V', 'Text styles': 'T', 'Effect styles': 'E', 'Components': 'C', 'Figma hygiene': 'H'}
cnt = {}
for r in L:
    p = pfx[r['cat']]; cnt[p] = cnt.get(p, 0) + 1; r['id'] = '%s-%02d' % (p, cnt[p])
json.dump(L, open('ledger.json', 'w'), indent=1)
print(len(L), cnt)
