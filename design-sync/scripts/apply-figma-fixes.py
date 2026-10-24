"""Record agent-applied Figma hygiene fixes in ledger.json (2026-10-24 run)."""
import json
L = json.load(open('ledger.json'))
FIX = {
 "Paddle Button": "gap 8 -> spacing/2 on both variants (215:20115, 216:20310)",
 "Chip": "padding on all 6 variants: Sm 12/8 -> spacing/3, spacing/2; Lg 16/12 -> spacing/4, spacing/3",
 "Pill-Tabs": "padding 2 -> spacing/0_5 on both sizes; radius 999 -> radius/full (9999, renders the same pill)",
 "Switch-Mode": "track radius 999 -> radius/full on both states; thumb radius 10 -> radius/full (20x20 circle, renders the same). Header instances inherit it",
 "MainNavItem": "horizontal padding 12 -> spacing/3 on 3 default-size variants",
 "Main Navigation Header": "gaps 40/24/20/12/4 -> spacing/10, 6, 5, 3, 1; Sm padding 20 -> spacing/5; Sm-Open util menu top padding 20 -> spacing/5. Thumb radius fixed via Switch-Mode",
 "Input Label": "gap 2 -> spacing/0_5 on both sizes",
}
VALUE_CHANGE = {"Pill-Tabs", "Switch-Mode"}
for r in L:
    if r['cat'] == 'Figma hygiene' and r['item'] in FIX:
        r['status'] = 'fixed-in-figma'
        r['cls'] = 'hygiene'
        r['notes'] = 'Fixed by agent 2026-10-24: ' + FIX[r['item']] + ('. Radius value changed (999/10 -> 9999), visual result identical; review.' if r['item'] in VALUE_CHANGE else '. Values unchanged, binding only.')
    if r['cat'] == 'Components' and 'Has Figma hygiene items' in r['notes']:
        r['notes'] = r['notes'].replace('Has Figma hygiene items, see H rows', 'Figma hygiene fixed 2026-10-24, see H rows')
json.dump(L, open('ledger.json', 'w'), indent=1)
print(sum(r['status'] == 'fixed-in-figma' for r in L))
