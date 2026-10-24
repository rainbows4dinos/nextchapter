import json
L = json.load(open('ledger.json')); inv = json.load(open('figma-inventory.json'))
cats = [('Variables', sum(len(v['vars']) for v in inv['variables'].values())), ('Text styles', len(inv['textStyles'])), ('Effect styles', len(inv['effectStyles'])), ('Paint styles', 0), ('Components', 24), ('Figma hygiene', None)]
out = ["# Design sync ledger", "",
 "- Figma file: nextchapter (hLBR7Nl3GelwM9hstQb3Ah), library pages Brand 45:3, Components 92:5175",
 "- Figma last modified: not exposed by the plugin API; inventory read 2026-10-24",
 "- Code baseline: 66eac22 (2026-10-22)",
 "- Audit run: 2026-10-24 with lr-design-system-sync (audit, mapping, and approved Figma hygiene fixes; no code changed)",
 "- Direction: Figma to code",
 "- Machine-readable copy: ledger.json (source for the Figma mirror)", "",
 "## Inventory", "",
 "| Category | Figma count | Ledger rows | Synced | Open |", "|---|---|---|---|---|"]
FIXLOG = ["", "## Figma fixes applied", "", "- 2026-10-24: agent bound 59 unbound padding, gap and radius values in 7 components to existing Spacing and Radius variables (user-approved). Only exact value matches were bound, except 6 pill and circle radii (999 or 10) moved to radius/full (9999), which renders identically. Re-scan of all 24 library components found 0 unbound padding, gap or radius values."]
for c, n in cats:
    rs = [r for r in L if r['cat'] == c]
    if c == 'Variables':
        import re
        covered = sum(int(re.search(r'\((\d+)\)', r['item']).group(1)) for r in rs)
        assert covered == n, (covered, n)
        rowtxt = '%d groups (%d vars)' % (len(rs), covered)
    else: rowtxt = str(len(rs))
    if n is not None and c != 'Variables': assert len(rs) == n, (c, len(rs), n)
    out.append('| %s | %s | %s | %d | %d |' % (c, n if n is not None else '-', rowtxt, sum(r['status'] == 'synced' for r in rs), sum(r['status'] not in ('synced', 'skipped', 'fixed-in-figma') for r in rs)))
from collections import Counter
out += FIXLOG
out += ["", "Status totals: " + ', '.join('%s %d' % kv for kv in sorted(Counter(r['status'] for r in L).items())), "", "## Rows", "",
 "| ID | Category | Item | Figma ref | Code ref | Class | Status | Notes |", "|---|---|---|---|---|---|---|---|"]
for r in L:
    out.append('| %(id)s | %(cat)s | %(item)s | %(fref)s | `%(cref)s` | %(cls)s | %(status)s | %(notes)s |' % r)
out += ["", "## Component checklists", "", "Filled in during component sync, one section per component (C rows), with verification evidence."]
open('ledger.md', 'w').write('\n'.join(out) + '\n')
print('\n'.join(out[:22]))
