import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peopleSearch } from '../people-search.js';
const query = url => new URL(url).searchParams.get('q');

test('Google URLs encode a quoted normalized employer and fixed role terms only', () => {
  const result = peopleSearch('  AT&T   R&D + 日本  ', 'Senior Software Engineer');
  const url = new URL(result.leaders);
  assert.equal(url.origin + url.pathname, 'https://www.google.com/search');
  assert.deepEqual([...url.searchParams.keys()], ['q']);
  assert.match(query(result.leaders), /"AT&T R&D 日本"/);
  assert.match(query(result.leaders), /"Engineering Manager"/);
  assert.match(result.leaders, /%26/);
  assert.equal(peopleSearch('Acme', 'Design Manager').company, 'Acme');
});

test('specific disciplines precede generic product, sales and marketing matches', () => {
  for (const [title, expected] of [['Product Designer','design'], ['Director of UX','design'], ['Product Marketing Manager','marketing'], ['Product Manager','product'], ['Staff Software Engineer','engineering'], ['Marketing Director','marketing'], ['Account Executive','sales'], ['Financial Analyst','finance'], ['Supply Chain Manager','operations'], ['Sales Operations Manager','operations'], ['Product Operations Lead','operations'], ['Museum Curator',null]]) {
    assert.equal(peopleSearch('Acme', title).discipline, expected, title);
  }
});

test('seniority adapts leadership vocabulary without treating Lead as management', () => {
  assert.match(query(peopleSearch('Acme','Product Design Director').leaders), /VP of Design/);
  assert.match(query(peopleSearch('Acme','Design Manager').leaders), /Design Director/);
  assert.match(query(peopleSearch('Acme','Principal Engineer').leaders), /Head of Engineering/);
  assert.equal(peopleSearch('Acme','Lead Product Designer').seniority, 'ic');
  assert.equal(peopleSearch('Acme','Lead Engineering Manager').seniority, 'management');
  assert.equal(peopleSearch('Acme','Head of Product').seniority, 'leadership');
  assert.match(query(peopleSearch('Acme','Engineer').recruiters), /technical recruiter/);
  assert.match(query(peopleSearch('Acme','Finance Director').leaders), /Chief Financial Officer/);
  assert.match(query(peopleSearch('Acme','Head of Operations').leaders), /Chief Operating Officer/);
  assert.match(query(peopleSearch('Acme','VP Engineering').leaders), /Chief Technology Officer/);
});

test('missing/placeholder employers disable searches; ambiguous real names are not invented or enriched', () => {
  for (const company of [null, undefined, '', '   ', '-', 'Unknown', 'Confidential', 'Confidential Client', 'N/A', 'TBD', 'not provided', 'name@example.org', 'https://example.org', 'Acme 415-555-0123', 'a'.repeat(501)]) {
    const result = peopleSearch(company,'Designer');
    assert.equal(result.leaders, null, String(company)); assert.equal(result.recruiters, null);
  }
  assert.equal(peopleSearch('Mercury',null).company, 'Mercury');
  assert.match(query(peopleSearch('Mercury',null).leaders), /department head/);
  assert.match(query(peopleSearch('Acme','Museum Curator').recruiters), /recruiter/);
});

test('input cannot escape company quoting, add destination parameters or leak unknown title content', () => {
  const result = peopleSearch('Acme" OR site:evil.invalid \\ # &x=private', 'Museum Curator private@example.org 4155550123');
  const q = query(result.leaders);
  assert.equal(new URL(result.leaders).hostname, 'www.google.com');
  assert.match(q, /^site:linkedin\.com\/in\/ "[^"]+" \("team leader" OR "department head" OR "director"\)$/);
  assert.doesNotMatch(result.leaders, /private%40|4155550123|Museum/);
  const privateRecord = { company:'Acme', title:'Designer', notes:'PRIVATE_NOTES', id:'PRIVATE_ID', connections:[{contact:'PRIVATE_CONTACT'}], job_description:'PRIVATE_DESCRIPTION' };
  assert.doesNotMatch(JSON.stringify(peopleSearch(privateRecord.company, privateRecord.title)), /PRIVATE/);
  assert.equal(peopleSearch('Acme','x'.repeat(200)+' engineer').discipline, null);
});
