# Project evidence and claim boundaries

Reviewed November 2, 2026 through the connected GitHub plugin, in the requested order: Seeens, nextchapter, Esatto.

## Review method and source limits

Read each README, repository file inventory, and selected implementation files. The nextchapter canonical career files supplied the career-history baseline. The referenced "nextchapter planning.txt" was not available in the local project sources, this chat, or the referenced conversation. A connected Drive title search did not find it. This delivery therefore updates the repository's canonical career materials; it is not a verified revision of the missing attachment.

Capabilities described as implemented are supported by code inspection. Deployment and historical acceptance statements are repository-reported, with supporting records where available. No app was launched, deployed, or exercised against live data during this review; no product test suites or Esatto workflows were run. Reading test code establishes the presence and scope of checks, not a fresh passing result.

Larry's AI-assisted authorship and hand-editing practice are supplied career facts. These repositories are consistent with that practice, but the review does not establish who authored every line or whether every workflow was personally executed. No adoption, revenue, measured time savings, or general production-readiness rating is inferred.

## 1. Seeens

Reviewed commit: `f854ba230616d10ce5047c557e99aa7a55668b95`.

| Claim used | Evidence | Boundary |
| --- | --- | --- |
| Closed alpha, launched November 1, 2026; initial band Merwulf | [README](https://github.com/rainbows4dinos/Seeens/blob/f854ba230616d10ce5047c557e99aa7a55668b95/README.md); [closed launch issue #13](https://github.com/rainbows4dinos/Seeens/issues/13) | Repository-reported release. Issue records two-member cross-device checks, overlapping edits, unauthorized/revoked access, redirects and export. No independent live acceptance performed here. |
| Connections, scene memberships, archive/restore and quick status changes persist | [connection actions](https://github.com/rainbows4dinos/Seeens/blob/f854ba230616d10ce5047c557e99aa7a55668b95/src/lib/connections/actions.ts) | Selected implementation inspected, not every screen or error path. |
| Outreach and assigned next actions, with previous actions retained | [outreach actions](https://github.com/rainbows4dinos/Seeens/blob/f854ba230616d10ce5047c557e99aa7a55668b95/src/lib/outreach/actions.ts); [database access tests](https://github.com/rainbows4dinos/Seeens/blob/f854ba230616d10ce5047c557e99aa7a55668b95/supabase/tests/database/workspace_access.test.sql) | Action handler calls the database RPC; test source covers history and assignment boundaries. |
| Member-gated CSV export | [export route](https://github.com/rainbows4dinos/Seeens/blob/f854ba230616d10ce5047c557e99aa7a55668b95/src/app/api/export/route.ts) | Explicit authentication and membership checks, plus workspace-scoped row access. No export executed in this review. |
| Workspace privacy and access-validation work | [database test source](https://github.com/rainbows4dinos/Seeens/blob/f854ba230616d10ce5047c557e99aa7a55668b95/supabase/tests/database/workspace_access.test.sql); launch issue above | Tests cover anonymous/non-member/other-workspace/member behavior and history constraints. Not a security certification. |
| Product judgment around scope, relational status and history | [product context](https://github.com/rainbows4dinos/Seeens/blob/f854ba230616d10ce5047c557e99aa7a55668b95/docs/context.md); README | Context contains some older conceptual wording; use current README and code for implemented state. |
| Next.js / TypeScript / Tailwind / Supabase / Vercel | README and reviewed implementation paths | Stack and hosting documented. No claims of scale or mature operations. |

The current project supersedes the older Artist Pathway / BandPath discovery concept. Automated scraping, AI recommendations, automatic messaging, social integrations, graph visualization and multi-band customer support are deferred. README identifies phase 2 visual refinement as next work. Member provisioning is manual.

## 2. nextchapter

Reviewed commit: `4524318e80f0130c0ff374c414ab39df3120cf68`.

| Claim used | Evidence | Boundary |
| --- | --- | --- |
| Shared career context, three connected tools and separate deployment paths | [README](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/README.md) | A personal tool suite; no hiring-success or user-adoption metrics. |
| Tailoring, revisions, QA and PDF/DOCX/ATS/ZIP export implementation | [Builder source](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/tools/resume-tailor.html) | Source includes canonical-context parsing, generation/revision handling and document packaging. No new generated export inspected here. |
| Identity and employment facts enforced separately from generated prose | [context parser and canonical experience enforcement](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/tools/shared/resume-context.mjs) | Preserving headings matters: Contact, Experience, Additional Experience, Education and Certifications are parsed. |
| Private Tracker, status history, editable ATS posting previews | README; [ingestion HTTP boundary](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/tools/prospect-tracker/ingestion/handler.js) | Greenhouse, Ashby, Lever, account-qualified Workable and limited Workday support is documented; not arbitrary employer-site support. Handler verifies identity, gates the owner, bounds requests and returns previews. |
| Persistent Radar decisions and separate explicit Tracker handoff | [feed controller](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/tools/prospect-tracker/radar-feed-controller.js); [feed/release documentation](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/docs/career-radar/opportunity-feed.md) | Accept records interest; Add to Prospects creates/reuses a tracking record. Deeper evaluation remains future work. |
| Live discovery disabled | [research client](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/tools/prospect-tracker/radar-research-client.js) | `RESEARCH_ENABLED = false`; do not describe autonomous live research or applications as shipped. |
| Anthropic generation via separate proxy Worker | [proxy source](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/tools/proxy-worker.js); README | Server-side API secret with model/origin controls. The documented optional shared key is not authentication; do not describe it as private-record security. |
| Shared Figma-based tokens and components | README; repository inventory includes `tools/shared/` and sync evidence | Does not establish perfect Figma parity or a full accessibility audit. |

### Career facts used as baseline

The original five canonical files were read at the commit above:

- [resume-master.md](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/docs/career-context/resume-master.md)
- [experience-framing.md](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/docs/career-context/experience-framing.md)
- [voice-and-format.md](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/docs/career-context/voice-and-format.md)
- [tone-and-positioning.md](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/docs/career-context/tone-and-positioning.md)
- [rules.json](https://github.com/rainbows4dinos/nextchapter/blob/4524318e80f0130c0ff374c414ab39df3120cf68/docs/career-context/rules.json)

Conflict resolved in the editable copies: resume-master.md and experience-framing.md define the independent practice as May 2026–Present, while voice-and-format.md still used May–September 2026 and prohibited implying an ongoing business. The revised guidance follows the master: an ongoing independent practice including unpaid projects, with no implication of a current paying client. Paid contract dates remain June–September 2026; volunteer film dates remain May–July 2026.

Historical roles and their source qualifiers were retained. G2 Solutions and Wisdom Panel metrics remain in experience-framing.md; Vacasa's +9 guest NPS claim remains in resume-master.md. They were preserved as supplied career context, not independently re-measured. No new management counts, hiring responsibilities, early-career roles, client launches, or project start dates were added.

## 3. Esatto

Reviewed commit: `bd54cecddf00479f7c3fe0db7e47da68da34edd6`.

| Claim used | Evidence | Boundary |
| --- | --- | --- |
| Packaged four-skill design-agent workflow | [README](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/README.md); [marketplace manifest](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/.claude-plugin/marketplace.json); [package script](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/scripts/package.sh) | Installation/package machinery exists. Installation and marketplace distribution were not tested here; adoption unverified. |
| Read-only Figma inspection and evidence baseline | [inspect-figma instructions](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/inspect-figma/SKILL.md) | An agent instruction contract, not a standalone Figma inspection engine. |
| Distinct directions with hypotheses and constrained scope | [explore-directions instructions](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/explore-directions/SKILL.md) | Does not guarantee the quality of generated alternatives. |
| Editable native construction with a build manifest | [build-in-figma instructions](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/build-in-figma/SKILL.md) | Intent and procedure verified in source; no Figma output constructed or inspected in this review. |
| Figma-to-code sync with resumable item ledger | [sync instructions](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/sync-design-system/SKILL.md); [ledger implementation](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/sync-design-system/scripts/ledger.py) | Current sync direction is one-way. Ledger checks statuses, inventory coverage and component evidence references; it does not prove semantic equivalence on its own. |
| Executable prototype and token checks | [Playwright checker](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/explore-directions/scripts/check-prototype.mjs); [token diff](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/sync-design-system/scripts/token-diff.py) | Checker inspects declared interactions, rendering, selected focus states and console errors; not a complete accessibility or usability audit. Token comparison depends on supplied inventory/configuration. |
| Explicit uncertainty and protected-source boundaries | [shared conventions](https://github.com/rainbows4dinos/Esatto/blob/bd54cecddf00479f7c3fe0db7e47da68da34edd6/shared/conventions.md) | These are workflow policies, not evidence that every run followed them. |

## Safe application language

- Seeens: "Designed and built a private music-network workspace with AI assistance, taking it through a documented closed-alpha launch and two-member workflow validation."
- nextchapter: "Built connected career tools for tailored application documents and private prospect tracking, using shared career facts and editable job-posting previews."
- Esatto: "Created reusable design-agent skills and verification scripts for Figma inspection, exploration, editable construction, and design-system sync."

These are draft building blocks. Select evidence for the role and retain the canonical code-credit policy. Do not turn all three into a single claim of production maturity.
