import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 6.13, 8] saves a rectangle as a UTF-8 SVG document', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-save-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const file = join(directory, 'demo.svg');
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  dispatcher.dispatch(['create', 'rect', 'r1', '10', '20', '100', '50', '#eee']);

  assert.deepEqual(dispatcher.dispatch(['save', file]), [`saved to ${file} (1 elements)`]);
  assert.equal(
    await readFile(file, 'utf8'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">',
      '  <rect id="r1" x="10" y="20" width="100" height="50" fill="#eee"/>',
      '</svg>',
      '',
    ].join('\n'),
  );
});
