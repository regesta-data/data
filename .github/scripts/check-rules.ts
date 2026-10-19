// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: 2026 Manuel Wechner (Berth)

// Build rules from 06-recht-anwaltsfragen.md, checked on every CC BY data file:
//   B2-1  no HowTheyVote content in CC BY files (no htv source, no htv_vote, no ODbL licence, no vote_on edge, no votes/ directory)
//   B3-1  no individual votes and no per-MEP metrics
//   G1    no personal data at all (no names, no EP person ids, no group, no party, no votes); roles only as a link to the API
// The same file runs in the data repository, so it uses Node built-ins only.
// Usage: node scripts/check-rules.ts [dir ...]   (default: test/reference-cases)

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export interface Violation {
  rule: 'B2-1' | 'B3-1' | 'G1';
  file: string;
  path: string;
  message: string;
}

const HTV_KEYS = new Set(['htv_vote', 'htv_id', 'odbl_notice']);
const HTV_SOURCE_IDS = new Set(['htv', 'howtheyvote']);
const ODBL_LICENSES = new Set(['ODbL-1.0', 'DbCL-1.0']);

const B31_KEYS = new Set([
  'member_votes', 'mep_votes', 'individual_votes', 'vote_position', 'attendance', 'group_loyalty',
  'loyalty', 'voting_statistics', 'mep_statistics', 'votes_with',
]);

const G1_KEYS = new Set([
  'person', 'persons', 'mep', 'meps', 'ep_id', 'ep_person_id', 'person_id', 'had_participant_person',
  'name', 'first_name', 'last_name', 'family_name', 'given_name', 'full_name', 'email',
  'rapporteur', 'rapporteurs', 'shadow_rapporteur', 'shadow_rapporteurs',
  'political_group', 'group', 'national_party', 'party', 'votes', 'vote',
]);
const G1_VALUE_PATTERNS: [RegExp, string][] = [
  [/^(https?:\/\/data\.europarl\.europa\.eu\/)?person\/\d+$/, 'EP person identifier'],
  [/eli\/dl\/participation\//, 'EP participation record (names a person)'],
];
const PEOPLE_LINK = /^https:\/\/regesta\.io\/v1\/procedures\/[a-z0-9-]+\/people$/;

export function checkDocument(doc: unknown, file: string): Violation[] {
  const out: Violation[] = [];
  const add = (rule: Violation['rule'], path: string, message: string) => out.push({ rule, file, path, message });
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}/${i}`));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        const here = `${path}/${key}`;
        if (HTV_KEYS.has(key)) add('B2-1', here, `field "${key}" belongs only to the ODbL voting database`);
        if ((key === 'source' || key === 'source_id') && typeof value === 'string' && HTV_SOURCE_IDS.has(value.toLowerCase()))
          add('B2-1', here, 'HowTheyVote as a source in a CC BY file');
        if (key === 'license' && typeof value === 'string' && ODBL_LICENSES.has(value))
          add('B2-1', here, `licence ${value} in a CC BY file`);
        if (key === 'edge' && value === 'vote_on') add('B2-1', here, 'edge vote_on (R8) belongs only to votes/vote_links');
        if (B31_KEYS.has(key)) add('B3-1', here, `field "${key}" (individual votes or per-MEP metric)`);
        if (G1_KEYS.has(key)) add('G1', here, `personal-data field "${key}"`);
        if (key === 'people' && (typeof value !== 'string' || !PEOPLE_LINK.test(value)))
          add('G1', here, 'people must be only a link to https://regesta.io/v1/procedures/<slug>/people');
        walk(value, here);
      }
      return;
    }
    if (typeof node === 'string') {
      for (const [pattern, what] of G1_VALUE_PATTERNS) if (pattern.test(node)) add('G1', path || '/', `${what}: ${node}`);
    }
  };
  walk(doc, '');
  return out;
}

export function checkTree(root: string): Violation[] {
  const out: Violation[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.git') continue;
      const full = join(dir, entry);
      const rel = relative(root, full).split(sep).join('/');
      if (statSync(full).isDirectory()) {
        if (entry === 'votes') out.push({ rule: 'B2-1', file: rel, path: '', message: 'votes/ directory in a CC BY tree (G1: no votes on GitHub)' });
        visit(full);
      } else if (entry.endsWith('.json') || entry.endsWith('.jsonl')) {
        const text = readFileSync(full, 'utf8');
        const docs = entry.endsWith('.jsonl') ? text.split('\n').filter((l) => l.trim()) : [text];
        docs.forEach((d, i) => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(d);
          } catch {
            out.push({ rule: 'G1', file: rel, path: `line ${i + 1}`, message: 'not valid JSON, cannot be checked' });
            return;
          }
          out.push(...checkDocument(parsed, entry.endsWith('.jsonl') ? `${rel}:${i + 1}` : rel));
        });
      }
    }
  };
  visit(root);
  return out;
}

if (import.meta.main) {
  const dirs = process.argv.slice(2);
  const roots = dirs.length ? dirs : ['test/reference-cases'];
  const violations = roots.flatMap((r) => checkTree(r).map((v) => ({ ...v, file: join(r, v.file).split(sep).join('/') })));
  for (const v of violations) console.error(`${v.rule} ${v.file} ${v.path}: ${v.message}`);
  console.log(`check-rules: ${violations.length} violation(s) in ${roots.join(', ')} (rules B2-1, B3-1, G1)`);
  process.exit(violations.length ? 1 : 0);
}
