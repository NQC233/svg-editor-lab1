import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.4, 6.4, 6.10] scales every leaf type around the canvas origin', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'r', '-10', '20', '30', '40', 'red']);
  dispatcher.dispatch(['create', 'circle', 'c', '100', '80', '20', 'blue']);
  dispatcher.dispatch(['create', 'ellipse', 'e', '-1.5', '2.25', '3', '4']);
  dispatcher.dispatch(['create', 'line', 'l', '5', '6', '7', '8', 'black']);
  dispatcher.dispatch(['create', 'text', 't', '20', '40', '开始']);

  assert.deepEqual(dispatcher.dispatch(['scale', 'r', '2']), ['rect#r scaled by 2']);
  assert.deepEqual(dispatcher.dispatch(['scale', 'c', '0.5']), ['circle#c scaled by 0.5']);
  assert.deepEqual(dispatcher.dispatch(['scale', 'e', '2']), ['ellipse#e scaled by 2']);
  assert.deepEqual(dispatcher.dispatch(['scale', 'l', '0.5']), ['line#l scaled by 0.5']);
  assert.deepEqual(dispatcher.dispatch(['scale', 't', '2']), ['text#t scaled by 2']);

  assert.deepEqual(dispatcher.dispatch(['show', 'r']), [
    'rect#r  parent=svg',
    '  x=-20 y=40 width=60 height=80',
    '  fill=red',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'c']), [
    'circle#c  parent=svg',
    '  cx=50 cy=40 r=10',
    '  fill=blue',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'e']), [
    'ellipse#e  parent=svg',
    '  cx=-3 cy=4.5 rx=6 ry=8',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'l']), [
    'line#l  parent=svg',
    '  x1=2.5 y1=3 x2=3.5 y2=4',
    '  stroke=black',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 't']), [
    'text#t  parent=svg',
    '  x=40 y=80',
    '  text="开始"',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['text#t scale restored']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['line#l scale restored']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['line#l scaled by 0.5']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['line#l scale restored']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['ellipse#e scale restored']);
});

test('[spec 5.4, 6.4, 6.10] scales a nested container subtree once and restores exact geometry', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'g', 'inner', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'r', '10', '20', '30', '40', 'red', 'in', 'inner']);
  dispatcher.dispatch(['create', 'text', 'label', '15', '25', '开始', 'in', 'inner']);
  dispatcher.dispatch(['create', 'circle', 'dot', '50.5', '60.25', '5', 'in', 'outer']);

  assert.deepEqual(dispatcher.dispatch(['scale', 'outer', '2']), ['g#outer scaled by 2']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── g#inner',
    '│   ├── rect#r      x=20 y=40 w=60 h=80 fill=red',
    '│   └── text#label  (30,50) "开始"',
    '└── circle#dot  cx=101 cy=120.5 r=10',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#outer scale restored']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── g#inner',
    '│   ├── rect#r      x=10 y=20 w=30 h=40 fill=red',
    '│   └── text#label  (15,25) "开始"',
    '└── circle#dot  cx=50.5 cy=60.25 r=5',
  ]);

  assert.deepEqual(dispatcher.dispatch(['redo']), ['g#outer scaled by 2']);
  assert.deepEqual(dispatcher.dispatch(['show', 'label']), [
    'text#label  parent=g#inner',
    '  x=30 y=50',
    '  text="开始"',
  ]);
});

test('[spec 2, 6.4, 6.10, 9] treats factor one and empty containers as history-neutral no-ops', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '10', '20', '30', '40']);
  dispatcher.dispatch(['create', 'rect', 'b', '50', '60', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.deepEqual(dispatcher.dispatch(['scale', 'a', '1']), ['rect#a unchanged']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);

  dispatcher.dispatch(['create', 'g', 'empty']);
  dispatcher.dispatch(['create', 'rect', 'temporary', '70', '80', '5', '5']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#temporary removed']);
  assert.deepEqual(dispatcher.dispatch(['scale', 'empty', '2']), ['g#empty unchanged']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#temporary created']);
});

test('[spec 6.4, 6.10, 9] a no-op scale does not unlock an existing history barrier', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '10', '20', '30', '40']);
  dispatcher.dispatch(['canvas', '640', '480']);

  assert.deepEqual(dispatcher.dispatch(['scale', 'a', '1']), ['rect#a unchanged']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
});

test('[spec 6.4, 6.10, 9] a scaling edit clears redo and remains one undo unit', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '10', '20', '30', '40']);
  dispatcher.dispatch(['create', 'rect', 'b', '50', '60', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.deepEqual(dispatcher.dispatch(['scale', 'a', '2']), ['rect#a scaled by 2']);
  assert.throws(() => dispatcher.dispatch(['redo']), new DomainError('nothing to redo'));
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#a scale restored']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#a scaled by 2']);
});

test('[spec 6.4, 6.10, 9] successful scales unlock a barrier while failures preserve it', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '10', '20', '30', '40']);
  dispatcher.dispatch(['canvas', '640', '480']);

  assert.throws(
    () => dispatcher.dispatch(['scale', 'a', '0']),
    new DomainError('scale factor must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );

  assert.deepEqual(dispatcher.dispatch(['scale', 'a', '2']), ['rect#a scaled by 2']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#a scale restored']);
});

test('[spec 3.3, 5.4, 6.4, 6.10] rejects invalid scales and rolls back a partial subtree scale', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'scene']);
  dispatcher.dispatch(['create', 'rect', 'safe', '10', '20', '30', '40', 'in', 'scene']);
  dispatcher.dispatch([
    'create',
    'line',
    'overflow',
    '1e308',
    '0',
    '1e308',
    '0',
    'black',
    'in',
    'scene',
  ]);
  dispatcher.dispatch(['create', 'rect', 'tiny', '0', '0', '5e-324', '5e-324']);
  dispatcher.dispatch(['create', 'rect', 'pending', '70', '80', '5', '5']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#pending removed']);

  assert.throws(
    () => dispatcher.dispatch(['scale', 'scene', '10']),
    new DomainError('invalid number: Infinity'),
  );
  assert.throws(
    () => dispatcher.dispatch(['scale', 'tiny', '0.5']),
    new DomainError('rect width must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['scale', 'missing', '2']),
    new DomainError('no such shape: missing'),
  );
  assert.throws(
    () => dispatcher.dispatch(['scale', 'safe', 'nope']),
    new DomainError('invalid number: nope'),
  );
  assert.throws(
    () => dispatcher.dispatch(['scale', 'safe', '-1']),
    new DomainError('scale factor must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['scale', 'safe']),
    new DomainError('usage: scale <id> <factor>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['scale', 'safe', '2', '3']),
    new DomainError('usage: scale <id> <factor>'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree', 'scene']), [
    'g#scene',
    '├── rect#safe      x=10 y=20 w=30 h=40',
    '└── line#overflow  (1e+308,0) -> (1e+308,0)',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'tiny']), [
    'rect#tiny  parent=svg',
    '  x=0 y=0 width=5e-324 height=5e-324',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#pending created']);
});

test('[spec 3.3, 6.4] requires a document before validating scale arguments', () => {
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['scale', 'r', '2']),
    new DomainError("no document. use 'init' or 'read' first"),
  );
});
