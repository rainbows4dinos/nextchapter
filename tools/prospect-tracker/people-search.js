/** Search terms are fixed vocabulary plus a quoted, bounded saved employer.
 * Never pass a prospect object, description, contact or notes to a destination.
 * @param {string|null|undefined} input */
function employer(input) {
  if (typeof input !== 'string' || input.length > 500 || /@|:\/\/|\d[\d ()+.-]{7,}\d/.test(input)) return null;
  const name = input.replace(/[^\p{L}\p{N}\p{M}\s&.'’()-]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!/[\p{L}\p{N}]/u.test(name) || name.length > 160 || /^(?:unknown|undisclosed|confidential(?: company| client)?|n\s*a|not (?:specified|provided)|tbd|company)$/i.test(name)) return null;
  return name;
}

const DISCIPLINES = [
  { match: /\b(?:sales|revenue|business|product|marketing|finance|people) operations\b/, name: 'operations', noun: 'Operations', recruiter: ['operations recruiter', 'talent acquisition'] },
  { match: /\b(?:product design|ux|ui|user experience|user interface)\b/, name: 'design', noun: 'Design', recruiter: ['design recruiter', 'talent acquisition'] },
  { match: /\b(?:product market\w*|marketing|growth market\w*|brand|content strateg\w*)\b/, name: 'marketing', noun: 'Marketing', recruiter: ['marketing recruiter', 'talent acquisition'] },
  { match: /\b(?:design|designer)\b/, name: 'design', noun: 'Design', recruiter: ['design recruiter', 'talent acquisition'] },
  { match: /\b(?:engineer\w*|software|developer|devops|sre)\b/, name: 'engineering', noun: 'Engineering', recruiter: ['technical recruiter', 'engineering recruiter', 'talent acquisition'] },
  { match: /\b(?:product|product management)\b/, name: 'product', noun: 'Product', recruiter: ['product recruiter', 'talent acquisition'] },
  { match: /\b(?:sales|account executive|business development)\b/, name: 'sales', noun: 'Sales', recruiter: ['sales recruiter', 'talent acquisition'] },
  { match: /\b(?:finance|financial|accountant|accounting|controller)\b/, name: 'finance', noun: 'Finance', recruiter: ['finance recruiter', 'talent acquisition'] },
  { match: /\b(?:operations|logistics|supply chain)\b/, name: 'operations', noun: 'Operations', recruiter: ['operations recruiter', 'talent acquisition'] }
];

const CHIEF_TITLES = /** @type {Record<string,string>} */ ({
  Design: 'Chief Design Officer', Product: 'Chief Product Officer', Engineering: 'Chief Technology Officer',
  Marketing: 'Chief Marketing Officer', Sales: 'Chief Revenue Officer', Finance: 'Chief Financial Officer', Operations: 'Chief Operating Officer'
});

/** Pure, saved-field-only builder. Seniority changes search vocabulary, never a reporting claim.
 * @param {string|null|undefined} company @param {string|null|undefined} title */
export function peopleSearch(company, title) {
  const name = employer(company);
  const role = typeof title === 'string' ? title.slice(0, 200).toLowerCase().replace(/\s+/g, ' ').trim() : '';
  const discipline = DISCIPLINES.find(item => item.match.test(role));
  const seniority = /\b(?:director|vp|vice president|head|chief)\b/.test(role) ? 'leadership'
    : /\bmanager\b/.test(role) ? 'management' : /\b(?:staff|principal|distinguished)\b/.test(role) ? 'advanced-ic' : 'ic';
  if (!name) return { company: null, discipline: discipline?.name ?? null, seniority, leaders: null, recruiters: null };
  const noun = discipline?.noun;
  const leaders = noun ? seniority === 'leadership' ? [`VP of ${noun}`, `Head of ${noun}`, CHIEF_TITLES[noun]]
    : seniority === 'management' || seniority === 'advanced-ic' ? [`${noun} Director`, `Head of ${noun}`, `VP ${noun}`]
      : [`${noun} Manager`, `${noun} Director`, `Head of ${noun}`]
    : ['team leader', 'department head', 'director'];
  /** @param {string[]} terms */
  const search = terms => {
    const query = `site:linkedin.com/in/ "${name}" (${terms.map(term => `"${term}"`).join(' OR ')})`;
    const url = new URL('https://www.google.com/search'); url.searchParams.set('q', query);
    return url.href;
  };
  return { company: name, discipline: discipline?.name ?? null, seniority,
    leaders: search(leaders), recruiters: search(discipline?.recruiter ?? ['recruiter', 'talent acquisition']) };
}
