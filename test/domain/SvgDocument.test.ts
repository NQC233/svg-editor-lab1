import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { Group } from '../../src/domain/Group.js';
import { GroupedShapePlacement } from '../../src/domain/GroupedShapePlacement.js';
import { GroupSnapshot } from '../../src/domain/GroupSnapshot.js';
import { Rect } from '../../src/domain/Rect.js';
import { ShapePlacement } from '../../src/domain/ShapePlacement.js';
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

test('[spec 6.8] moves a subtree to another container end and restores its origin', () => {
  const document = new SvgDocument(800, 600);
  const source = new Group('source');
  const before = new Rect('before', 0, 0, 10, 10);
  const moving = new Group('moving');
  const child = new Rect('child', 20, 20, 10, 10);
  const after = new Rect('after', 40, 40, 10, 10);
  const target = new Group('target');
  const existing = new Rect('existing', 60, 60, 10, 10);

  document.appendShape(source);
  document.appendShape(before, source);
  document.appendShape(moving, source);
  document.appendShape(child, moving);
  document.appendShape(after, source);
  document.appendShape(target);
  document.appendShape(existing, target);

  const placement = document.moveToEnd(moving, target);

  assert.equal(placement?.parent, source);
  assert.equal(placement?.index, 1);
  assert.deepEqual(document.childrenOf(source), [before, after]);
  assert.deepEqual(document.childrenOf(target), [existing, moving]);
  assert.deepEqual(document.childrenOf(moving), [child]);
  assert.equal(document.parentLabelOf(moving), 'g#target');
  assert.equal(document.find('child'), child);
  assert.equal(document.parentLabelOf(child), 'g#moving');

  document.restorePlacement(moving, placement!);

  assert.deepEqual(document.childrenOf(source), [before, moving, after]);
  assert.deepEqual(document.childrenOf(target), [existing]);
  assert.deepEqual(document.childrenOf(moving), [child]);
  assert.equal(document.parentLabelOf(moving), 'g#source');
  assert.equal(document.parentLabelOf(child), 'g#moving');
});

test('[spec 6.8, 9] moves within one parent, reports a last-child no-op, and rejects cycles atomically', () => {
  const document = new SvgDocument(800, 600);
  const container = new Group('container');
  const first = new Rect('first', 0, 0, 10, 10);
  const second = new Rect('second', 20, 20, 10, 10);
  const last = new Rect('last', 40, 40, 10, 10);
  const branch = new Group('branch');
  const nested = new Rect('nested', 60, 60, 10, 10);

  document.appendShape(container);
  document.appendShape(first, container);
  document.appendShape(second, container);
  document.appendShape(last, container);
  document.appendShape(branch, container);
  document.appendShape(nested, branch);

  const placement = document.moveToEnd(first, container);
  assert.equal(placement?.parent, container);
  assert.equal(placement?.index, 0);
  assert.deepEqual(document.childrenOf(container), [second, last, branch, first]);
  assert.equal(document.moveToEnd(first, container), undefined);
  assert.deepEqual(document.childrenOf(container), [second, last, branch, first]);

  assert.throws(
    () => document.moveToEnd(container, branch),
    new DomainError('cannot move a container into its own descendant: container'),
  );
  assert.throws(
    () => document.moveToEnd(container, container),
    new DomainError('cannot move a container into its own descendant: container'),
  );
  assert.deepEqual(document.childrenOf(container), [second, last, branch, first]);
  assert.deepEqual(document.childrenOf(branch), [nested]);
});

test('[spec 6.6] groups mixed targets at the first target location in original document order', () => {
  const document = new SvgDocument(800, 600);
  const same = new Group('same');
  const before = new Rect('before', 0, 0, 10, 10);
  const a = new Rect('a', 0, 0, 10, 10);
  const b = new Rect('b', 20, 20, 10, 10);
  const c = new Rect('c', 40, 40, 10, 10);
  const other = new Group('other');
  const d = new Rect('d', 60, 60, 10, 10);
  const e = new Rect('e', 80, 80, 10, 10);
  const combined = new Group('combined');

  document.appendShape(same);
  document.appendShape(before, same);
  document.appendShape(a, same);
  document.appendShape(b, same);
  document.appendShape(c, same);
  document.appendShape(other);
  document.appendShape(d, other);
  document.appendShape(e, other);

  const snapshot = document.groupShapes(combined, ['b', 'd', 'a']);

  assert.equal(snapshot.group, combined);
  assert.equal(snapshot.parent, same);
  assert.equal(snapshot.index, 1);
  assert.deepEqual(snapshot.children, [a, b, d]);
  assert.deepEqual(document.childrenOf(same), [before, combined, c]);
  assert.deepEqual(document.childrenOf(combined), [a, b, d]);
  assert.deepEqual(document.childrenOf(other), [e]);
  assert.equal(document.parentLabelOf(a), 'g#combined');
  assert.equal(document.parentLabelOf(d), 'g#combined');

  document.restoreGrouped(snapshot);

  assert.deepEqual(document.childrenOf(same), [before, a, b, c]);
  assert.deepEqual(document.childrenOf(other), [d, e]);
  assert.deepEqual(document.childrenOf(combined), []);
  assert.equal(document.find('combined'), undefined);
  assert.equal(document.parentLabelOf(a), 'g#same');
  assert.equal(document.parentLabelOf(d), 'g#other');

  document.reapplyGroup(snapshot);

  assert.deepEqual(document.childrenOf(same), [before, combined, c]);
  assert.deepEqual(document.childrenOf(combined), [a, b, d]);
  assert.deepEqual(document.childrenOf(other), [e]);
});

test('[spec 3.3, 6.6] rejects invalid group targets without changing the tree', () => {
  const document = new SvgDocument(800, 600);
  const outer = new Group('outer');
  const inner = new Group('inner');
  const leaf = new Rect('leaf', 0, 0, 10, 10);
  document.appendShape(outer);
  document.appendShape(inner, outer);
  document.appendShape(leaf, inner);

  assert.throws(
    () => document.groupShapes(new Group('combined'), ['inner', 'inner']),
    new DomainError('duplicate target: inner'),
  );
  assert.throws(
    () => document.groupShapes(new Group('combined'), ['leaf', 'missing']),
    new DomainError('no such shape: missing'),
  );
  assert.throws(
    () => document.groupShapes(new Group('outer'), ['leaf']),
    new DomainError('id already exists: outer'),
  );
  assert.throws(
    () => document.groupShapes(new Group('combined'), ['outer', 'leaf']),
    new DomainError('cannot group a container into its own descendant: outer'),
  );
  assert.throws(
    () => document.groupShapes(new Group('combined'), ['inner', 'outer', 'leaf']),
    new DomainError('cannot group a container into its own descendant: inner'),
  );

  assert.deepEqual(document.rootShapes, [outer]);
  assert.deepEqual(document.childrenOf(outer), [inner]);
  assert.deepEqual(document.childrenOf(inner), [leaf]);
  assert.equal(document.find('combined'), undefined);
});

test('[spec 3.3, 6.6] rejects inconsistent group placements before changing the tree', () => {
  const document = new SvgDocument(800, 600);
  const source = new Group('source');
  const a = new Rect('a', 0, 0, 10, 10);
  const b = new Rect('b', 20, 20, 10, 10);
  const combined = new Group('combined');
  document.appendShape(source);
  document.appendShape(a, source);
  document.appendShape(b, source);

  document.groupShapes(combined, ['a', 'b']);
  const inconsistent = new GroupSnapshot(combined, source, 0, [
    new GroupedShapePlacement(a, new ShapePlacement(source, 0)),
    new GroupedShapePlacement(b, new ShapePlacement(source, 99)),
  ]);

  assert.throws(
    () => document.restoreGrouped(inconsistent),
    new DomainError('cannot restore grouped container: combined'),
  );
  assert.equal(document.find('combined'), combined);
  assert.deepEqual(document.childrenOf(source), [combined]);
  assert.deepEqual(document.childrenOf(combined), [a, b]);

  const selfParented = new GroupSnapshot(combined, source, 0, [
    new GroupedShapePlacement(a, new ShapePlacement(combined, 0)),
    new GroupedShapePlacement(b, new ShapePlacement(source, 1)),
  ]);
  assert.throws(
    () => document.restoreGrouped(selfParented),
    new DomainError('cannot restore grouped container: combined'),
  );
  assert.equal(document.find('combined'), combined);
  assert.deepEqual(document.childrenOf(source), [combined]);
  assert.deepEqual(document.childrenOf(combined), [a, b]);
  assert.equal(document.parentLabelOf(a), 'g#combined');
  assert.equal(document.parentLabelOf(b), 'g#combined');
});
