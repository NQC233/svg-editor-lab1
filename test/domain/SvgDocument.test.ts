import assert from 'node:assert/strict';
import test from 'node:test';

import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';

test('[spec 6.1] returns a detached child view without bypassing document indexes', () => {
  const document = new SvgDocument(100, 100);
  const group = new Group('scene');
  const rectangle = new Rect('r1', 0, 0, 10, 10);
  document.appendShape(group);
  document.appendShape(rectangle, group);

  const children = document.childrenOf(group) as Rect[];
  children.length = 0;
  const roots = document.rootShapes as Group[];
  roots.length = 0;

  assert.deepEqual(document.childrenOf(group), [rectangle]);
  assert.deepEqual(document.rootShapes, [group]);
  assert.equal(document.find('r1'), rectangle);
  assert.equal(document.parentLabelOf(rectangle), 'g#scene');
});
