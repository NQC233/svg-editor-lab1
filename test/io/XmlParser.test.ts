import assert from 'node:assert/strict';
import test from 'node:test';

import { XmlElement } from '../../src/io/XmlElement.js';
import { XmlParser } from '../../src/io/XmlParser.js';
import { XmlText } from '../../src/io/XmlText.js';
import { DomainError } from '../../src/shared/DomainError.js';

test('[spec 7.2] parses declarations, comments, attributes, entities, CDATA, and nesting', () => {
  const document = new XmlParser().parse(
    [
      '\uFEFF<?xml version="1.0" encoding="UTF-8"?>',
      '<!-- outside -->',
      '<svg width="100" height="50" data-name="A &amp; B">',
      "  <g id='outer'>",
      '    <rect x="1" y="2" width="3" height="4"/>',
      '    <text id="label">A&amp;B &#65; &#x1F642;<![CDATA[<raw & text>]]></text>',
      '  </g>',
      '  <!-- inside -->',
      '</svg>',
    ].join('\n'),
  );

  assert.equal(document.root.name, 'svg');
  assert.equal(document.root.attribute('data-name'), 'A & B');
  const rootElements = document.root.children.filter(
    (child): child is XmlElement => child instanceof XmlElement,
  );
  assert.equal(rootElements.length, 1);

  const group = rootElements[0];
  assert.ok(group !== undefined);
  assert.equal(group.name, 'g');
  assert.equal(group.attribute('id'), 'outer');
  const groupElements = group.children.filter(
    (child): child is XmlElement => child instanceof XmlElement,
  );
  assert.equal(groupElements.length, 2);

  const rect = groupElements[0];
  assert.ok(rect !== undefined);
  assert.equal(rect.name, 'rect');
  assert.equal(rect.attribute('width'), '3');

  const text = groupElements[1];
  assert.ok(text !== undefined);
  const textNodes = text.children.filter((child): child is XmlText => child instanceof XmlText);
  assert.equal(textNodes.length, 2);
  assert.equal(textNodes[0]?.value, 'A&B A 🙂');
  assert.equal(textNodes[0]?.cdata, false);
  assert.equal(textNodes[1]?.value, '<raw & text>');
  assert.equal(textNodes[1]?.cdata, true);
});

test('[spec 7.3] preserves attribute order and refuses duplicate attributes', () => {
  const document = new XmlParser().parse('<svg width="1" height="2"/>');
  assert.deepEqual(
    document.root.attributes.map(([name]) => name),
    ['width', 'height'],
  );

  assert.throws(
    () => new XmlParser().parse('<svg width="1" width="2" height="2"/>'),
    new DomainError('invalid SVG: duplicate attribute: width'),
  );
});

test('[spec 7.2, 10] rejects malformed structure and unsupported XML constructs', () => {
  const parser = new XmlParser();
  const cases: readonly [string, string][] = [
    ['<svg><g></svg>', 'invalid SVG: mismatched closing tag: svg'],
    ['<svg><g></g>', 'invalid SVG: unclosed element: svg'],
    ['<svg>&unknown;</svg>', 'invalid SVG: unknown entity: &unknown;'],
    ['<!DOCTYPE svg><svg/>', 'invalid SVG: DOCTYPE is not supported'],
    [
      '<svg/><?xml-stylesheet href="x.css"?>',
      'invalid SVG: processing instruction is not supported',
    ],
    ['<svg><1/></svg>', 'invalid SVG: malformed element'],
  ];

  for (const [source, message] of cases) {
    assert.throws(() => parser.parse(source), new DomainError(message));
  }
});
