import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

async function fixture(directory: string, name: string, content: string | Buffer): Promise<string> {
  const path = join(directory, name);
  await writeFile(path, content);
  return path;
}

test('[spec 6.12, 7] reads every shape, nested containers, entities, direct text, and CDATA', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-read-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const path = await fixture(
    directory,
    'read me.svg',
    [
      '\uFEFF<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200" version="1.1" custom="ignored">',
      '  <g id="scene" fill="none">',
      '    <![CDATA[ignored in a container]]>',
      '    <rect id="r" x="1" y="2" width="3" height="4" fill="#fff" stroke="black" stroke-width="2">',
      '      <![CDATA[ignored in a leaf]]>',
      '    </rect>',
      '    <circle id="c" cx="5" cy="6" r="7"/>',
      '    <ellipse id="e" cx="8" cy="9" rx="10" ry="11"/>',
      '    <line id="l" x1="12" y1="13" x2="14" y2="15" stroke="red"/>',
      '    <text id="label" x="16" y="17">A&amp;B<![CDATA[ <C>]]></text>',
      '    <g id="nested">',
      '      <![CDATA[ignored in a nested container]]>',
      '      <rect id="child" x="18" y="19" width="2" height="2"/>',
      '    </g>',
      '  </g>',
      '  <![CDATA[ignored at the root]]>',
      '  <text id="empty-text">empty</text>',
      '</svg>',
    ].join('\n'),
  );
  const dispatcher = createDispatcher();

  assert.deepEqual(dispatcher.dispatch(['read', path]), [`read ${path} (9 elements)`]);
  assert.deepEqual(dispatcher.dispatch(['show', 'label']), [
    'text#label  parent=g#scene',
    '  x=16 y=17',
    '  text="A&B <C>"',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'empty-text']), [
    'text#empty-text  parent=svg',
    '  x=0 y=0',
    '  text="empty"',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), [
    'g#scene',
    '├── rect#r      x=1 y=2 w=3 h=4 fill=#fff',
    '├── circle#c    cx=5 cy=6 r=7',
    '├── ellipse#e   cx=8 cy=9 rx=10 ry=11',
    '├── line#l      (12,13) -> (14,15)',
    '├── text#label  (16,17) "A&B <C>"',
    '└── g#nested',
    '    └── rect#child  x=18 y=19 w=2 h=2',
  ]);
});

test('[spec 3.3, 6.12, 9] read barriers and later editing use the normal history protocol', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-read-history-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const path = await fixture(
    directory,
    'input.svg',
    '<svg width="100" height="80"><rect id="base" x="1" y="2" width="3" height="4"/></svg>',
  );
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['read', path]);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
  assert.throws(
    () => dispatcher.dispatch(['redo']),
    new DomainError('undo not allowed after io command'),
  );

  assert.deepEqual(dispatcher.dispatch(['create', 'rect', 'next', '5', '6', '7', '8']), [
    'rect#next created',
  ]);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#next removed']);
  assert.throws(() => dispatcher.dispatch(['undo']), new DomainError('nothing to undo'));
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#next created']);
});

test('[spec 6.12] validates read argument count before touching the document', () => {
  const dispatcher = createDispatcher();

  assert.throws(() => dispatcher.dispatch(['read']), new DomainError('usage: read <file.svg>'));
  assert.throws(
    () => dispatcher.dispatch(['read', 'one.svg', 'two.svg']),
    new DomainError('usage: read <file.svg>'),
  );
});

test('[spec 6.12, 7, 10] rejects unsupported or malformed SVG and stays atomic', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-read-errors-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const cases: readonly [string, string, string][] = [
    ['wrong-root.svg', '<g width="100" height="80"/>', 'invalid SVG: root element must be svg'],
    [
      'doctype.svg',
      '<!DOCTYPE svg><svg width="100" height="80"/>',
      'invalid SVG: DOCTYPE is not supported',
    ],
    [
      'pi.svg',
      '<svg width="100" height="80"/><?xml-stylesheet href="x.css"?>',
      'invalid SVG: processing instruction is not supported',
    ],
    [
      'duplicate-attr.svg',
      '<svg width="100" width="200" height="80"/>',
      'invalid SVG: duplicate attribute: width',
    ],
    [
      'mismatched.svg',
      '<svg width="100" height="80"><g id="g"></svg>',
      'invalid SVG: mismatched closing tag: svg',
    ],
    [
      'root-size.svg',
      '<svg width="no" height="80"/>',
      'svg root width and height must be positive numbers',
    ],
    [
      'root-missing-size.svg',
      '<svg height="80"/>',
      'svg root width and height must be positive numbers',
    ],
    [
      'root-negative.svg',
      '<svg width="100" height="0"/>',
      'svg root width and height must be positive numbers',
    ],
    [
      'invalid-viewbox.svg',
      '<svg width="100" height="80" viewBox="0 0 nope 80"/>',
      'invalid viewBox: 0 0 nope 80',
    ],
    [
      'unsupported-viewbox.svg',
      '<svg width="100" height="80" viewBox="0 0 200 80"/>',
      'unsupported viewBox: 0 0 200 80',
    ],
    [
      'xmlns.svg',
      '<svg xmlns="urn:other" width="100" height="80"/>',
      'unsupported xmlns: urn:other',
    ],
    [
      'root-transform.svg',
      '<svg width="100" height="80" transform="scale(2)"/>',
      'unsupported transform on svg',
    ],
    [
      'root-style.svg',
      '<svg width="100" height="80" style="fill:red"/>',
      'unsupported attribute: style',
    ],
    [
      'root-event.svg',
      '<svg width="100" height="80" onload="x()"/>',
      'unsupported attribute: onload',
    ],
    [
      'transform.svg',
      '<svg width="100" height="80"><rect id="r" x="0" y="0" width="1" height="1" transform="translate(1)"/></svg>',
      'unsupported transform on rect',
    ],
    [
      'style.svg',
      '<svg width="100" height="80"><rect id="r" x="0" y="0" width="1" height="1" style="fill:red"/></svg>',
      'unsupported attribute: style',
    ],
    [
      'event.svg',
      '<svg width="100" height="80"><rect id="r" x="0" y="0" width="1" height="1" onclick="x()"/></svg>',
      'unsupported attribute: onclick',
    ],
    [
      'unknown-element.svg',
      '<svg width="100" height="80"><path id="p" d="M0 0"/></svg>',
      'unsupported element: path',
    ],
    [
      'metadata.svg',
      '<svg width="100" height="80"><title>title</title></svg>',
      'unsupported element: title',
    ],
    [
      'unknown-attr.svg',
      '<svg width="100" height="80"><rect id="r" x="0" y="0" width="1" height="1" rx="2"/></svg>',
      'unsupported attribute: rx',
    ],
    [
      'missing-id.svg',
      '<svg width="100" height="80"><rect x="0" y="0" width="1" height="1"/></svg>',
      'invalid SVG: missing id on rect',
    ],
    [
      'empty-id.svg',
      '<svg width="100" height="80"><rect id="" x="0" y="0" width="1" height="1"/></svg>',
      'invalid SVG: missing id on rect',
    ],
    [
      'whitespace-id.svg',
      '<svg width="100" height="80"><rect id="bad id" x="0" y="0" width="1" height="1"/></svg>',
      'invalid id: bad id',
    ],
    [
      'duplicate-id.svg',
      '<svg width="100" height="80"><rect id="r" x="0" y="0" width="1" height="1"/><circle id="r" cx="1" cy="1" r="1"/></svg>',
      'id already exists: r',
    ],
    [
      'text-child.svg',
      '<svg width="100" height="80"><text id="t">a<tspan>b</tspan></text></svg>',
      'unsupported element: tspan',
    ],
    [
      'group-text.svg',
      '<svg width="100" height="80"><g id="g">unexpected</g></svg>',
      'invalid SVG: unexpected text in g',
    ],
    [
      'missing-size.svg',
      '<svg width="100" height="80"><rect id="r" x="0" y="0" height="1"/></svg>',
      'rect width must be positive',
    ],
  ];

  for (const [name, content, message] of cases) {
    const dispatcher = createDispatcher();
    dispatcher.dispatch(['init', '100', '80']);
    dispatcher.dispatch(['create', 'rect', 'kept', '0', '0', '10', '10']);
    const path = await fixture(directory, name, content);

    assert.throws(() => dispatcher.dispatch(['read', path]), new DomainError(message), name);
    assert.deepEqual(
      dispatcher.dispatch(['tree']),
      ['svg (100x80)', '└── rect#kept  x=0 y=0 w=10 h=10'],
      name,
    );
  }
});

test('[spec 3.3, 6.12] failed reads preserve the document, current path, and redo history', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-read-atomic-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const validPath = await fixture(
    directory,
    'valid.svg',
    '<svg width="100" height="80"><rect id="base" x="0" y="0" width="1" height="1"/></svg>',
  );
  const invalidPath = await fixture(
    directory,
    'invalid.svg',
    '<svg width="100" height="80"><rect id="next" x="0" y="0" width="0" height="1"/></svg>',
  );
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['read', validPath]);
  dispatcher.dispatch(['create', 'rect', 'next', '2', '2', '3', '3']);
  dispatcher.dispatch(['undo']);
  const before = dispatcher.dispatch(['tree']);

  assert.throws(
    () => dispatcher.dispatch(['read', invalidPath]),
    new DomainError('rect width must be positive'),
  );
  assert.deepEqual(dispatcher.dispatch(['tree']), before);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#next created']);
  assert.deepEqual(dispatcher.dispatch(['save']), [`saved to ${validPath} (2 elements)`]);
});

test('[spec 6.12] reports file and UTF-8 read failures without changing state', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-read-io-'));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const invalidUtf8 = join(directory, 'invalid-utf8.svg');
  await writeFile(invalidUtf8, Buffer.from([0xff, 0xfe]));
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '100', '80']);
  assert.throws(
    () => dispatcher.dispatch(['read', join(directory, 'missing.svg')]),
    new DomainError(`cannot read file: ${join(directory, 'missing.svg')}`),
  );
  assert.throws(
    () => dispatcher.dispatch(['read', invalidUtf8]),
    new DomainError('invalid SVG: invalid UTF-8'),
  );
  assert.deepEqual(dispatcher.dispatch(['tree']), ['svg (100x80)']);
});
