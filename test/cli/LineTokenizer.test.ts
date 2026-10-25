import assert from 'node:assert/strict';
import test from 'node:test';

import { LineTokenizer } from '../../src/cli/LineTokenizer.js';
import { DomainError } from '../../src/shared/DomainError.js';

test('[spec 4.2] tokenizes quoted values with spaces and empty tokens', () => {
  const tokenizer = new LineTokenizer();

  assert.deepEqual(tokenizer.tokenize('init "800 600" "" #fff'), ['init', '800 600', '', '#fff']);
});

test('[spec 4.2] applies quote/backslash escapes and preserves other backslashes', () => {
  const tokenizer = new LineTokenizer();

  assert.deepEqual(tokenizer.tokenize('cmd "a\\"b" "a\\\\b" "a\\nb" "" \\x'), [
    'cmd',
    'a"b',
    'a\\b',
    'a\\nb',
    '',
    '\\x',
  ]);
});

test('[spec 4.2] ignores lines whose first non-space character is #', () => {
  const tokenizer = new LineTokenizer();

  assert.equal(tokenizer.tokenize('  # ignored'), null);
  assert.deepEqual(tokenizer.tokenize('set r1 fill #fff'), ['set', 'r1', 'fill', '#fff']);
});

test('[spec 4.2] rejects an unterminated quoted value', () => {
  const tokenizer = new LineTokenizer();

  assert.throws(
    () => tokenizer.tokenize('init "800 600'),
    new DomainError('unterminated quoted string'),
  );
});
