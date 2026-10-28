import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recognizePosting, samePosting } from '../ingestion/posting-url.js';
import { ingestPosting } from '../ingestion/pipeline.js';
import { ingestAshby, selectAshbyPosting } from '../ingestion/ashby.js';
import { retrieveJob } from '../ingestion-client.js';
import { createIngestionHandler } from '../ingestion/handler.js';

// Synthetic identity and content: fixture success, never a live posting claim.
const id = '721cea00-1234-4567-89ab-0123456789ab';
const root = 'https://jobs.ashbyhq.com/';
const url = `${root}jasper%20ai/${id}`;
const signal = () => new AbortController().signal;
const ownerId = '11111111-1111-4111-8111-111111111111';
const detailMessage = 'Use a supported Ashby job detail URL with a complete job ID.';

function fixture(boardName = 'jasper%20ai', upstreamBoard = 'j%61sper%20ai', metadataBoard = 'jasper ai') {
  const calls = [];
  const job = { id, jobUrl: `${root}${upstreamBoard}/${id}`, title: 'Fixture Designer', descriptionPlain: 'Fixture responsibilities.', location: 'Remote', isRemote: true };
  const board = { apiVersion: '1', jobs: [{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }, job] };
  const metadata = { '@type': 'JobPosting', url: `${root}${metadataBoard}/${id}`, identifier: { value: id }, title: job.title, hiringOrganization: { name: 'Fixture Company' } };
  const fetcher = async (target, init) => {
    calls.push(String(target));
    assert.equal(init.redirect, 'manual');
    return calls.length === 1 ? Response.json(board) : new Response(`<script type="application/ld+json">${JSON.stringify(metadata)}</script>`, { headers: { 'content-type': 'text/html' } });
  };
  return { calls, job, board, fetcher, url: `${root}${boardName}/${id}` };
}

test('Ashby normalizes only approved decoded board characters and stable posting identities', () => {
  const expected = recognizePosting(url);
  assert.equal(expected.board, 'jasper ai');
  assert.equal(expected.canonical_url, url);
  assert.equal(expected.retrieval_url, 'https://api.ashbyhq.com/posting-api/job-board/jasper%20ai?includeCompensation=true');
  for (const board of ['jasper%20ai', 'jasper ai', 'j%61sper%20ai', '%6Aasper%20ai']) {
    for (const suffix of ['', '/', '/application', '/application/']) {
      const actual = recognizePosting(`${root}${board}/${id.toUpperCase()}${suffix}?utm_source=x&SOURCE=x&ashby_source=x&locale=en#application`);
      assert.equal(samePosting(actual, expected), true);
      assert.equal(actual.canonical_url, `${url}?locale=en`);
    }
  }
  for (const board of ['abc123', 'jasper-ai', 'jasper_ai', 'Jasper AI', 'example.com', 'Example.Co', 'a'.repeat(100)]) assert.equal(recognizePosting(`${root}${board}/${id}`).board, board);
  assert.equal(recognizePosting(`${root}${'%61'.repeat(100)}/${id}`).board, 'a'.repeat(100));
  assert.equal(samePosting(recognizePosting(`${root}Jasper%20ai/${id}`), expected), false);
});

test('Ashby fails closed on malformed encodings, unsafe paths, IDs and URL authorities', () => {
  for (const board of ['bad%', 'bad%2', 'bad%GG', 'bad%C3', 'bad%2fpart', 'bad%5cpart', 'bad%2520part', 'bad%00', 'bad%09', 'bad%7f', 'bad%3f', 'bad%23', 'bad%3b', 'bad%3a', 'bad%40', 'bad%25', 'bad+name', 'café', 'caf%C3%A9', 'a'.repeat(101), '.', '..', '%2e', '%2e%2e', '.%2e', '%2e.', 'bad%252ename']) assert.throws(() => recognizePosting(`${root}${board}/${id}`));
  for (const input of [
    `${root}jasper/`, `${root}jasper`, `${root}jasper//`, `${root}jasper/721cea`, `${root}jasper/no-uuid`,
    `${url}/extra`, `${url}/APPLICATION`, `${root}jasper/%37${id.slice(1)}`, `${root}bad/../jasper/${id}`, `${root}bad/%2e%2e/jasper/${id}`, `${root}jas\tper/${id}`, `${root}jasper\\${id}`,
    url.replace('https:', 'http:'), url.replace('jobs.ashbyhq.com', 'jobs.ashbyhq.com.evil.invalid'), url.replace('jobs.ashbyhq.com', 'jobs.ashbyhq.com:444'), url.replace('jobs.ashbyhq.com', 'user:pass@jobs.ashbyhq.com'), url.replace('jobs.ashbyhq.com', 'jobs.ashbyhq.com@evil.invalid'), `${url}?long=${'a'.repeat(2048)}`
  ]) assert.throws(() => recognizePosting(input));
  assert.throws(() => recognizePosting(`${root}jasper/721cea`), e => e.code === 'unsupported_url' && e.status === 400 && e.message === detailMessage);
  assert.throws(() => recognizePosting(`${root}jasper/`), /not a board listing/);
  assert.throws(() => recognizePosting(url.replace('jobs.ashbyhq.com', 'jobs.lever.co')));
});

test('Ashby dotted board encodings and URL variations share the exact canonical identity', () => {
  const expected = recognizePosting(`${root}easyllama.com/${id}`);
  for (const board of ['easyllama.com', 'easyllama%2Ecom', 'easyllama%2ecom']) {
    for (const suffix of ['', '/', '/application', '/application/']) {
      const actual = recognizePosting(`${root}${board}/${id.toUpperCase()}${suffix}?utm_source=chatgpt.com&source=x&ashby_source=x&locale=en#application`);
      assert.equal(actual.board, 'easyllama.com');
      assert.equal(samePosting(actual, expected), true);
      assert.equal(actual.canonical_url, `${expected.canonical_url}?locale=en`);
      assert.equal(actual.retrieval_url, 'https://api.ashbyhq.com/posting-api/job-board/easyllama.com?includeCompensation=true');
    }
  }
  assert.throws(() => recognizePosting(`${root}bad%40name/${id}`), /board name contains unsupported characters/);
});

for (const entry of [ingestPosting, ingestAshby]) {
  for (const boardName of ['jasper%20ai', 'example.com']) {
    test(`${entry.name} ${boardName} retrieves the encoded board exactly once and matches upstream jobUrl and metadata`, async () => {
      const f = boardName === 'example.com' ? fixture(boardName, 'example%2Ecom', 'example.com') : fixture();
      const url = f.url;
      const preview = await entry(url, { fetcher: f.fetcher, signal: signal() });
      assert.deepEqual(f.calls, [recognizePosting(url).retrieval_url, url]);
      assert.equal(preview.identity.board, decodeURIComponent(boardName));
      assert.equal(preview.draft.company, 'Fixture Company');
      assert.equal(preview.draft.title, f.job.title);
      assert.equal(preview.draft.job_description, f.job.descriptionPlain);
      assert.equal(preview.draft.work_arrangement, 'remote');
      const withoutId = { ...f.job }; delete withoutId.id;
      assert.equal(selectAshbyPosting({ apiVersion: '1', jobs: [withoutId] }, preview.identity).title, f.job.title);
      for (const jobs of [[f.job, f.job], [{ ...f.job, jobUrl: url.replace(boardName, 'other') }], [{ ...f.job, id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }]]) assert.throws(() => selectAshbyPosting({ apiVersion: '1', jobs }, preview.identity), e => e.code === 'invalid_posting');
      assert.throws(() => selectAshbyPosting({ apiVersion: '1', jobs: [] }, preview.identity), e => e.code === 'unavailable' && e.status === 404);
    });
  }
}

for (const boardName of ['jasper%20ai', 'example.com']) {
  test(`frontend client through authenticated handler returns a consistent ${boardName} preview without writes`, async () => {
    const f = boardName === 'example.com' ? fixture(boardName, 'example%2Ecom', 'example.com') : fixture();
    const url = f.url;
    const handler = createIngestionHandler({ ownerId, allowedOrigins: ['https://example.invalid'], authenticate: async () => ownerId, fetcher: f.fetcher });
    let invocations = 0;
    // Only retrieval is provided: any database access would fail this fixture.
    const client = { functions: { invoke: async (name, options) => {
      invocations++;
      assert.equal(name, 'job-ingest');
      assert.equal(options.body.url, url);
      const response = await handler(new Request('https://edge.invalid', { method: 'POST', headers: { authorization: 'Bearer fixture', 'content-type': 'application/json' }, body: JSON.stringify(options.body) }));
      assert.equal(response.status, 200);
      return { data: await response.json(), error: null };
    } } };
    const preview = await retrieveJob(client, ` ${url} `, signal());
    assert.equal(invocations, 1);
    assert.equal(preview.draft.company, 'Fixture Company');
    assert.equal(preview.draft.title, 'Fixture Designer');
    assert.deepEqual(f.calls, [recognizePosting(url).retrieval_url, url]);
  });
}
