import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
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

test('[spec 8] serializes every shape, nested containers, styles, and escaped text', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-save-all-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const file = join(directory, 'all.svg');
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '320', '200']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['set', 'outer', 'stroke', 'a&<>"b']);
  dispatcher.dispatch(['create', 'rect', 'r', '1', '2', '3', '4', '#4a90d9', 'in', 'outer']);
  dispatcher.dispatch(['set', 'r', 'stroke-width', '2.5']);
  dispatcher.dispatch(['create', 'circle', 'c', '5', '6', '7', 'red', 'in', 'outer']);
  dispatcher.dispatch(['create', 'ellipse', 'e', '8', '9', '10', '11', 'blue', 'in', 'outer']);
  dispatcher.dispatch(['create', 'line', 'l', '12', '13', '14', '15', 'green', 'in', 'outer']);
  dispatcher.dispatch(['create', 'g', 'nested', 'in', 'outer']);
  dispatcher.dispatch(['create', 'text', 't', '16', '17', 'A & <B> "C"', 'in', 'nested']);
  dispatcher.dispatch(['set', 't', 'fill', '#fff']);
  dispatcher.dispatch(['set', 't', 'stroke', '#000']);
  dispatcher.dispatch(['create', 'g', 'empty', 'in', 'outer']);

  assert.deepEqual(dispatcher.dispatch(['save', file]), [`saved to ${file} (8 elements)`]);
  assert.equal(
    await readFile(file, 'utf8'),
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">',
      '  <g id="outer" stroke="a&amp;&lt;&gt;&quot;b">',
      '    <rect id="r" x="1" y="2" width="3" height="4" fill="#4a90d9" stroke-width="2.5"/>',
      '    <circle id="c" cx="5" cy="6" r="7" fill="red"/>',
      '    <ellipse id="e" cx="8" cy="9" rx="10" ry="11" fill="blue"/>',
      '    <line id="l" x1="12" y1="13" x2="14" y2="15" stroke="green"/>',
      '    <g id="nested">',
      '      <text id="t" x="16" y="17" fill="#fff" stroke="#000">A &amp; &lt;B&gt; &quot;C&quot;</text>',
      '    </g>',
      '    <g id="empty"/>',
      '  </g>',
      '</svg>',
      '',
    ].join('\n'),
  );
});

test('[spec 6.11, 6.13] reuses the current path and clears it on init', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-save-path-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const file = join(directory, 'with space.svg');
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '100', '80']);
  dispatcher.dispatch(['create', 'rect', 'r', '1', '2', '3', '4']);
  assert.deepEqual(dispatcher.dispatch(['save', file]), [`saved to ${file} (1 elements)`]);
  dispatcher.dispatch(['create', 'circle', 'c', '5', '6', '7']);

  assert.deepEqual(dispatcher.dispatch(['save']), [`saved to ${file} (2 elements)`]);
  assert.match(await readFile(file, 'utf8'), /<circle id="c"/);

  dispatcher.dispatch(['init', '200', '100']);
  assert.throws(
    () => dispatcher.dispatch(['save']),
    new DomainError('no file path; use save <file.svg>'),
  );
});

test('[spec 3.3, 6.13] reports save usage and failed writes without establishing a path', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-save-fail-path-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['save']),
    new DomainError("no document. use 'init' or 'read' first"),
  );

  dispatcher.dispatch(['init', '100', '80']);
  assert.throws(
    () => dispatcher.dispatch(['save', 'a.svg', 'b.svg']),
    new DomainError('usage: save [file.svg]'),
  );
  assert.throws(
    () => dispatcher.dispatch(['save', directory]),
    new DomainError(`cannot write file: ${directory}`),
  );
  assert.throws(
    () => dispatcher.dispatch(['save']),
    new DomainError('no file path; use save <file.svg>'),
  );
});

test('[spec 6.10, 6.13] a failed overwrite preserves the current path and history', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-save-atomic-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const file = join(directory, 'kept.svg');
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '100', '80']);
  dispatcher.dispatch(['create', 'rect', 'a', '1', '2', '3', '4']);
  dispatcher.dispatch(['save', file]);
  dispatcher.dispatch(['create', 'rect', 'b', '5', '6', '7', '8']);
  dispatcher.dispatch(['undo']);

  assert.throws(
    () => dispatcher.dispatch(['save', directory]),
    new DomainError(`cannot write file: ${directory}`),
  );
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);
  assert.deepEqual(dispatcher.dispatch(['save']), [`saved to ${file} (2 elements)`]);
  assert.match(await readFile(file, 'utf8'), /<rect id="b"/);
});

test('[spec 6.10, 6.13] a successful save clears and locks history', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-save-barrier-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const file = join(directory, 'barrier.svg');
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '100', '80']);
  dispatcher.dispatch(['create', 'rect', 'a', '1', '2', '3', '4']);
  dispatcher.dispatch(['save', file]);

  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
  assert.throws(
    () => dispatcher.dispatch(['redo']),
    new DomainError('undo not allowed after io command'),
  );

  dispatcher.dispatch(['create', 'rect', 'b', '5', '6', '7', '8']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);
  assert.throws(() => dispatcher.dispatch(['undo']), new DomainError('nothing to undo'));
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);
});
