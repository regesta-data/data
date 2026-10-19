// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Manuel Wechner (Berth)

// CLA check for pull requests (06-recht.md 9.1 Nr. 7). Every GitHub account that authored the pull request
// or one of its commits must have posted the sentence below in the pull request itself. Members of the
// regesta-data organisation (the licensor) and bot accounts are exempt.
// The result is a commit status "regesta/cla" on the head commit; branch protection requires it.
// No record is written to the repository (build rule G3): the contributor's own comment is the record on GitHub.
// Uses Node built-ins only, so it runs from the base branch without installing anything.

export const CLA_VERSION = '1.0';
export const CLA_SENTENCE = `I have read the CLA v${CLA_VERSION} and I agree`;
export const STATUS_CONTEXT = 'regesta/cla';
const EXEMPT_ASSOCIATIONS = new Set(['OWNER', 'MEMBER']);

export interface Account {
  login: string;
  type: string;
}

export interface ClaInput {
  author: Account;
  authorAssociation: string;
  commitAuthors: { login: string | null; type?: string; name: string }[];
  comments: { login: string; body: string }[];
}

export interface ClaResult {
  ok: boolean;
  signed: string[];
  missing: string[];
  unknownAuthors: string[];
  description: string;
}

const isBot = (a: { login: string; type?: string }): boolean => a.type === 'Bot' || a.login.endsWith('[bot]');
const normalise = (s: string): string => s.replace(/\s+/g, ' ').trim().replace(/[.!]+$/, '').toLowerCase();

export function hasAgreed(body: string): boolean {
  const wanted = normalise(CLA_SENTENCE);
  return body.split(/\r?\n/).some((line) => normalise(line) === wanted);
}

// Only the association of the pull request author is known from the event. Other commit authors must agree
// themselves, even if they are members; a member can simply post the sentence.
export function evaluateCla(input: ClaInput): ClaResult {
  const required = new Set<string>();
  const unknownAuthors: string[] = [];
  if (!isBot(input.author) && !EXEMPT_ASSOCIATIONS.has(input.authorAssociation)) required.add(input.author.login);
  for (const c of input.commitAuthors) {
    if (!c.login) unknownAuthors.push(c.name);
    else if (isBot({ login: c.login, type: c.type })) continue;
    else if (c.login === input.author.login && EXEMPT_ASSOCIATIONS.has(input.authorAssociation)) continue;
    else required.add(c.login);
  }
  const agreed = new Set(input.comments.filter((c) => hasAgreed(c.body)).map((c) => c.login));
  const signed = [...required].filter((l) => agreed.has(l)).sort();
  const missing = [...required].filter((l) => !agreed.has(l)).sort();
  const ok = missing.length === 0 && unknownAuthors.length === 0;
  const parts: string[] = [];
  if (missing.length) parts.push(`CLA missing for ${missing.map((l) => '@' + l).join(', ')}`);
  if (unknownAuthors.length) parts.push(`commit author(s) without a GitHub account: ${unknownAuthors.join(', ')}`);
  const description = !ok
    ? parts.join('; ')
    : required.size
      ? `CLA v${CLA_VERSION} agreed by all authors.`
      : 'Only members of the licensor organisation or bots; no CLA needed.';
  return { ok, signed, missing, unknownAuthors, description };
}

// ---- GitHub I/O -------------------------------------------------------------------------------

interface PullRequest {
  number: number;
  user: Account;
  author_association: string;
  head: { sha: string };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${process.env.GITHUB_API_URL ?? 'https://api.github.com'}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'regesta-cla-check',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path}: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function paged<T>(path: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const batch = await api<T[]>(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) return all;
  }
}

async function main(): Promise<number> {
  const { readFileSync, appendFileSync } = await import('node:fs');
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8')) as {
    pull_request?: { number: number };
    issue?: { number: number; pull_request?: unknown };
  };
  const number = event.pull_request?.number ?? (event.issue?.pull_request ? event.issue.number : undefined);
  if (!number) {
    console.log('Not a pull request event; nothing to check.');
    return 0;
  }
  const repo = process.env.GITHUB_REPOSITORY;
  const pr = await api<PullRequest>(`/repos/${repo}/pulls/${number}`);
  const commits = await paged<{ author: Account | null; commit: { author: { name: string } } }>(`/repos/${repo}/pulls/${number}/commits`);
  const comments = await paged<{ user: Account; body: string | null }>(`/repos/${repo}/issues/${number}/comments`);
  const result = evaluateCla({
    author: pr.user,
    authorAssociation: pr.author_association,
    commitAuthors: commits.map((c) => ({ login: c.author?.login ?? null, type: c.author?.type, name: c.commit.author.name })),
    comments: comments.map((c) => ({ login: c.user.login, body: c.body ?? '' })),
  });
  const server = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
  await api(`/repos/${repo}/statuses/${pr.head.sha}`, {
    method: 'POST',
    body: JSON.stringify({
      state: result.ok ? 'success' : 'failure',
      context: STATUS_CONTEXT,
      description: result.description.slice(0, 140),
      target_url: `${server}/${repo}/blob/main/CLA.md`,
    }),
  });
  const summary = [
    `### CLA check for #${number}: ${result.ok ? 'passed' : 'blocked'}`,
    result.description,
    result.ok ? '' : `To agree, post this sentence as a comment in the pull request: \`${CLA_SENTENCE}\` (text: CLA.md).`,
  ].join('\n\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  console.log(summary);
  return result.ok ? 0 : 1;
}

// exitCode instead of process.exit(): exiting while fetch connections are still open crashes Node on Windows.
if (import.meta.main) {
  main().then(
    (code) => (process.exitCode = code),
    (err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    },
  );
}
