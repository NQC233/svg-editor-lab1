import assert from 'node:assert/strict';
import test from 'node:test';

import { LineTokenizer } from '../../src/cli/LineTokenizer.js';
import { DomainError } from '../../src/shared/DomainError.js';

test('[spec 4.2] tokenizes quoted values with spaces and escapes', () => {
  const tokenizer = new LineTokenizer();

  assert.deepEqual(tokenizer.tokenize('init "800 600" "" #fff'), ['init', '800 600', '', '#fff']);
});

test('[spec 4.2] rejects an unterminated quoted value', () => {
  const tokenizer = new LineTokenizer();

  assert.throws(
    () => tokenizer.tokenize('init "800 600'),
    new DomainError('unterminated quoted string'),
  );
});
