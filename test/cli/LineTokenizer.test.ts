import assert from 'node:assert/strict';
import test from 'node:test';

import { LineTokenizer } from '../../src/cli/LineTokenizer.js';
import { DomainError } from '../../src/shared/DomainError.js';

test('[spec 4.2] tokenizes quoted values with spaces and empty tokens', () => {
  const tokenizer = new LineTokenizer();

  assert.deepEqual(
    tokenizer.tokenize('init "800 600" "" #fff')?.map(({ value, quoted }) => ({ value, quoted })),
    [
      { value: 'init', quoted: false },
      { value: '800 600', quoted: true },
      { value: '', quoted: true },
      { value: '#fff', quoted: false },
    ],
  );
});

test('[spec 4.2] applies quote/backslash escapes and preserves other backslashes', () => {
  const tokenizer = new LineTokenizer();

  assert.deepEqual(
    tokenizer.tokenize('cmd "a\\"b" "a\\\\b" "a\\nb" "" \\x')?.map(({ value, quoted }) => ({
      value,
      quoted,
    })),
    [
      { value: 'cmd', quoted: false },
      { value: 'a"b', quoted: true },
      { value: 'a\\b', quoted: true },
      { value: 'a\\nb', quoted: true },
      { value: '', quoted: true },
      { value: '\\x', quoted: false },
    ],
  );
});

test('[spec 4.2] distinguishes quoted keywords from unquoted syntax tokens', () => {
  const tokenizer = new LineTokenizer();

  assert.deepEqual(
    tokenizer
      .tokenize('create text t1 0 0 "in" in container')!
      .map(({ value, quoted }) => ({ value, quoted })),
    [
      { value: 'create', quoted: false },
      { value: 'text', quoted: false },
      { value: 't1', quoted: false },
      { value: '0', quoted: false },
      { value: '0', quoted: false },
      { value: 'in', quoted: true },
      { value: 'in', quoted: false },
      { value: 'container', quoted: false },
    ],
  );
});

test('[spec 4.2] ignores lines whose first non-space character is #', () => {
  const tokenizer = new LineTokenizer();

  assert.equal(tokenizer.tokenize('  # ignored'), null);
  assert.deepEqual(
    tokenizer.tokenize('set r1 fill #fff')?.map(({ value }) => value),
    ['set', 'r1', 'fill', '#fff'],
  );
});

test('[spec 4.2] rejects an unterminated quoted value', () => {
  const tokenizer = new LineTokenizer();

  assert.throws(
    () => tokenizer.tokenize('init "800 600'),
    new DomainError('unterminated quoted string'),
  );
});
