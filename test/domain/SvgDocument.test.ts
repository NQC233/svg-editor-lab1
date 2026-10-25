import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
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

test('[spec 6.7] ungroups a nested container in place and restores its exact subtree', () => {
  const document = new SvgDocument(800, 600);
  const outer = new Group('outer');
  const before = new Rect('before', 0, 0, 10, 10);
  const target = new Group('target');
  const first = new Rect('first', 20, 20, 10, 10);
  const branch = new Group('branch');
  const nested = new Rect('nested', 40, 40, 10, 10);
  const last = new Rect('last', 60, 60, 10, 10);
  const after = new Rect('after', 80, 80, 10, 10);

  document.appendShape(outer);
  document.appendShape(before, outer);
  document.appendShape(target, outer);
  document.appendShape(first, target);
  document.appendShape(branch, target);
  document.appendShape(nested, branch);
  document.appendShape(last, target);
  document.appendShape(after, outer);

  const snapshot = document.ungroup(target);

  assert.equal(document.find('target'), undefined);
  assert.deepEqual(document.childrenOf(target), []);
  assert.deepEqual(document.childrenOf(outer), [before, first, branch, last, after]);
  assert.equal(document.find('nested'), nested);
  assert.equal(document.parentLabelOf(nested), 'g#branch');

  document.restoreUngrouped(snapshot);

  assert.equal(document.find('target'), target);
  assert.deepEqual(document.childrenOf(outer), [before, target, after]);
  assert.deepEqual(document.childrenOf(target), [first, branch, last]);
  assert.deepEqual(document.childrenOf(branch), [nested]);
  assert.equal(document.parentLabelOf(target), 'g#outer');
  assert.equal(document.parentLabelOf(nested), 'g#branch');
});

test('[spec 6.7] rejects ungrouping a top-level container without changing the tree', () => {
  const document = new SvgDocument(800, 600);
  const topLevel = new Group('top');
  const child = new Rect('child', 0, 0, 10, 10);
  document.appendShape(topLevel);
  document.appendShape(child, topLevel);

  assert.throws(
    () => document.ungroup(topLevel),
    new DomainError('cannot ungroup top-level container: top'),
  );
  assert.deepEqual(document.rootShapes, [topLevel]);
  assert.equal(document.find('child'), child);
  assert.equal(document.parentLabelOf(child), 'g#top');
});
