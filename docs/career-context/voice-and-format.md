# Voice and Format

Rules for anything generated from these context files: tailored resumes, cover letters, outreach. resume-master.md is the facts layer, experience-framing.md is the why-it-mattered layer, this is the how-it-should-read layer.

The countable rules live in rules.json: bullet caps per role, word limits, the banned word list, role locations. The tailor tool injects that file into every prompt, checks its output against it, and builds its repair pass from it. Change a number there, never here, and never in the tool's HTML. This file holds the reasoning, the examples, and the judgment calls that cannot be expressed as a number.

---

# Resume Length

Length is the most common failure, and the fix is cutting, not compressing. Counts are in rules.json.

- One page. Two only if a role explicitly asks for a detailed history.
- The summary says who he is, what he has been doing, and what he wants to do next. No thesis statement about what design systems really are. No "Believe the most durable X are the ones that..."
- One idea per bullet. If a bullet has two colons or three clauses, it is two bullets, or it is one bullet with the filler removed.
- Do not write a role-level overview sentence and then bullets that repeat it. Pick one. Bullets are usually the better choice.
- Never invent metrics. Only Wisdom Panel, G2 Solutions, and Vacasa have real numbers.
- Never state how long he has been working. The strength is that he has done the work in every role, not how many years it adds up to. Write "in every role he has held", never a start year or a span. This applies to the cover letter too.

---

# Cover Letter

Four short paragraphs, within the word range in rules.json. If it runs past one screen, it is too long.

## Structure

1. **Greeting and the ask.** "Hi [name or team]," then say plainly what he is applying for and the one reason he is a fit. Name something specific and true about the company, the product, or the role.
2. **One story.** The single most relevant piece of work, with what the situation was and what he did. One story, not a survey of the career.
3. **What he would bring.** A short, specific paragraph about how he would work in this role. A point of view is fine here, but it has to be about the job, not about the discipline in general.
4. **Close.** Two sentences. What he would like to happen next.

## Opening Rules

- Always start with a greeting. Never open on a paragraph of industry observation.
- "Design systems work lives in a strange tension" is the exact failure mode to avoid. That is an essay opening, not a letter. A human reader has to reach paragraph three before learning why this person is writing.
- Get to first person in the first sentence or two. Say what he wants.
- Contractions are fine. Write like a note to a person he respects, not a position paper.

## Warmth

The letter should sound like it was written to a person, not filed.

- Enthusiasm is welcome. It just has to be specific. One concrete sentence about what makes this company or product interesting beats any amount of stated eagerness.
- The banned phrase is "excited to apply." Being interested is not banned. Say what caught his attention and why.
- Some personality belongs in here. A dry aside, a plain admission of what he does not know yet, or a small true detail does more for the letter than another paragraph proving competence.
- Greeting, first person, contractions. Write it the way he would write to someone he respects.
- The greeting is a required field. A letter that opens on a paragraph instead of a greeting is wrong, no matter how good the paragraph is.

## Anti-AI Tells

Check every draft for these and cut them:

- Antithesis constructions: "not just X, but Y", "the work that mattered most wasn't A, it was B", "that's not a failure, it's a signal". The cap is in rules.json. The first eBay draft had five.
- Abstract nouns doing the acting. Larry does things; "the work" does not.
- Every paragraph landing on a Big Insight. Some paragraphs should just end.
- Triads. Three-item lists in a sentence, over and over.
- Self-praise stated as virtue: "I take developing designers seriously", "I have a genuine point of view". Show it or cut it.
- The banned word list is in rules.json. Each of those words is standing in for a specific detail. Cut it and name the detail instead.
- Any banned word that appears anywhere in these files appears only because a rule or an example has to name it. It is never vocabulary to reuse.
- Sentences that could appear in any designer's letter. Delete anything that is not specific to Larry or to this company.
- Em dashes.

## Claiming Credit for Code

Larry's code is AI-generated first, then hand-edited. The language has to match that.

- The allowed and avoided verbs are in rules.json under creditForCode.
- Name the outcome and the system, not the act of typing. "Built the tooling that keeps tokens in sync" is true and stronger than "wrote a Figma plugin."
- Same rule for prototypes. He designed and built them. He did not write them.
- This is not modesty. Anyone who asks in an interview gets the straight answer, and the resume should not have set up a claim he then has to walk back.

## Voice

Direct, plainspoken, a little dry. Concrete over conceptual. Comfortable saying what is still unsettled instead of performing certainty. Explains what he would actually do on Monday, not what design leadership means in the abstract.

---

# Role Positioning and Recent Contract Work

Give Director / Head of Design and Staff / Principal IC roles equal priority. Tailor the summary to the role being applied for. Do not frame leadership as a selective fallback or imply that an IC application is temporary.

People management belongs explicitly in leadership positioning. Readiness to manage again is confirmed. Historical direct reports, hiring, performance management, and team size require role-specific facts; do not infer them from a Head or Director title or replace them with generic leadership claims.

Use “Independent Design Consultant” as the public role, “Product Design & Creative Projects” as the organization label, and May 2026 through Sep 2026 as the combined project period. Describe the product design consulting and PDX Pop Now! promotional film within the cap in rules.json. Explicitly identify the film as volunteer work. Include that project here or in a separate volunteer section, never both.

The paid contract itself ran Jun 2026 through Sep 2026 and ended before launch; claim no shipped outcomes or metrics for it. Keep its client unnamed and do not make it the cover-letter story. The PDX Pop Now! volunteer work ran May 2026 through Jul 2026 and produced a delivered film. Do not imply multiple paid clients, an ongoing business, or a longer paid contract. The fractional title remains an underlying career fact, while the approved public role describes the broader independent work.

Keep private client and departure context outside this public repository and out of application-generation inputs. Answer complete-history or direct client questions accurately using the private record. Do not manufacture continuity or move accomplishments to another employer.

# Practical AI and Building Language

Describe functional software, prototypes, and systems Larry built with AI assistance and hand editing. Name the artifact and contribution. Keep the code-credit policy above. Avoid claims of autonomous building, full-stack expertise, production ownership, or speed improvements without evidence. Distinguish speculative work, tested prototypes, and released features.

# LinkedIn Approval

Prepare proposed headline, About, and experience copy for Larry to review. Publish only after approval of the specific changes. Updating canonical documentation does not authorize a live profile update.
