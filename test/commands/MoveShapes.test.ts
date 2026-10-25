import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.4, 6.3, 6.10] moves every leaf type by finite positive and negative deltas', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'r', '0', '0', '10', '10', 'red']);
  dispatcher.dispatch(['create', 'circle', 'c', '100', '80', '20', 'blue']);
  dispatcher.dispatch(['create', 'ellipse', 'e', '-1.5', '2.25', '3', '4']);
  dispatcher.dispatch(['create', 'line', 'l', '5', '6', '7', '8', 'black']);
  dispatcher.dispatch(['create', 'text', 't', '20', '40', '开始']);

  assert.deepEqual(dispatcher.dispatch(['move', 'r', '10.5', '-5']), ['rect#r moved to (10.5,-5)']);
  assert.deepEqual(dispatcher.dispatch(['move', 'c', '-2.5', '1']), [
    'circle#c moved to (97.5,81)',
  ]);
  assert.deepEqual(dispatcher.dispatch(['move', 'e', '1.5', '-0.25']), [
    'ellipse#e moved to (0,2)',
  ]);
  assert.deepEqual(dispatcher.dispatch(['move', 'l', '-5', '4']), ['line#l moved to (0,10)']);
  assert.deepEqual(dispatcher.dispatch(['move', 't', '-5', '5']), ['text#t moved to (15,45)']);

  assert.deepEqual(dispatcher.dispatch(['show', 'r']), [
    'rect#r  parent=svg',
    '  x=10.5 y=-5 width=10 height=10',
    '  fill=red',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'c']), [
    'circle#c  parent=svg',
    '  cx=97.5 cy=81 r=20',
    '  fill=blue',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'e']), [
    'ellipse#e  parent=svg',
    '  cx=0 cy=2 rx=3 ry=4',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'l']), [
    'line#l  parent=svg',
    '  x1=0 y1=10 x2=2 y2=12',
    '  stroke=black',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 't']), [
    'text#t  parent=svg',
    '  x=15 y=45',
    '  text="开始"',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['text#t moved back to (20,40)']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['line#l moved back to (5,6)']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['line#l moved to (0,10)']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['line#l moved back to (5,6)']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['ellipse#e moved back to (-1.5,2.25)']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['ellipse#e moved to (0,2)']);
});

test('[spec 5.4, 6.3, 6.10] moves a nested container subtree once and restores exact geometry', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'outer']);
  dispatcher.dispatch(['create', 'g', 'inner', 'in', 'outer']);
  dispatcher.dispatch(['create', 'rect', 'r', '10', '20', '30', '40', 'red', 'in', 'inner']);
  dispatcher.dispatch(['create', 'text', 'label', '15', '25', '开始', 'in', 'inner']);
  dispatcher.dispatch(['create', 'circle', 'dot', '50.5', '60.25', '5', 'in', 'outer']);

  assert.deepEqual(dispatcher.dispatch(['move', 'outer', '0', '0']), ['g#outer unchanged']);
  assert.deepEqual(dispatcher.dispatch(['move', 'outer', '2.5', '-4']), [
    'g#outer moved by (2.5,-4)',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── g#inner',
    '│   ├── rect#r      x=12.5 y=16 w=30 h=40 fill=red',
    '│   └── text#label  (17.5,21) "开始"',
    '└── circle#dot  cx=53 cy=56.25 r=5',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['g#outer moved back by (-2.5,4)']);
  assert.deepEqual(dispatcher.dispatch(['tree', 'outer']), [
    'g#outer',
    '├── g#inner',
    '│   ├── rect#r      x=10 y=20 w=30 h=40 fill=red',
    '│   └── text#label  (15,25) "开始"',
    '└── circle#dot  cx=50.5 cy=60.25 r=5',
  ]);

  assert.deepEqual(dispatcher.dispatch(['redo']), ['g#outer moved by (2.5,-4)']);
  assert.deepEqual(dispatcher.dispatch(['show', 'label']), [
    'text#label  parent=g#inner',
    '  x=17.5 y=21',
    '  text="开始"',
  ]);
});

test('[spec 2, 6.3, 6.10, 9] treats zero deltas and empty containers as history-neutral no-ops', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.deepEqual(dispatcher.dispatch(['move', 'a', '0', '0']), ['rect#a unchanged']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#b created']);

  dispatcher.dispatch(['create', 'g', 'empty']);
  dispatcher.dispatch(['create', 'rect', 'temporary', '30', '30', '5', '5']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#temporary removed']);
  assert.deepEqual(dispatcher.dispatch(['move', 'empty', '5', '-3']), ['g#empty unchanged']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#temporary created']);
});

test('[spec 2, 6.3, 6.10, 9] treats a move lost to floating-point precision as a no-op', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'huge', '1e20', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'pending', '20', '20', '5', '5']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#pending removed']);

  assert.deepEqual(dispatcher.dispatch(['move', 'huge', '1', '0']), ['rect#huge unchanged']);
  assert.deepEqual(dispatcher.dispatch(['show', 'huge']), [
    'rect#huge  parent=svg',
    '  x=100000000000000000000 y=0 width=10 height=10',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#pending created']);
});

test('[spec 6.3, 6.10, 9] a no-op move does not unlock an existing history barrier', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '1e308', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '0', '0', '10', '10']);
  dispatcher.dispatch(['canvas', '640', '480']);

  assert.deepEqual(dispatcher.dispatch(['move', 'a', '0', '0']), ['rect#a unchanged']);
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );
});

test('[spec 6.3, 6.10, 9] a moving edit clears redo and remains one undo unit', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '0', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '20', '20', '10', '10']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b removed']);

  assert.deepEqual(dispatcher.dispatch(['move', 'a', '5', '-2']), ['rect#a moved to (5,-2)']);
  assert.throws(() => dispatcher.dispatch(['redo']), new DomainError('nothing to redo'));
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#a moved back to (0,0)']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#a moved to (5,-2)']);
});

test('[spec 6.3, 6.10, 9] successful moves unlock a barrier while failed moves preserve it', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'rect', 'a', '1e308', '0', '10', '10']);
  dispatcher.dispatch(['create', 'rect', 'b', '0', '0', '10', '10']);
  dispatcher.dispatch(['canvas', '640', '480']);

  assert.throws(
    () => dispatcher.dispatch(['move', 'a', '1e308', '0']),
    new DomainError('invalid number: Infinity'),
  );
  assert.throws(
    () => dispatcher.dispatch(['undo']),
    new DomainError('undo not allowed after io command'),
  );

  assert.deepEqual(dispatcher.dispatch(['move', 'b', '1', '1']), ['rect#b moved to (1,1)']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#b moved back to (0,0)']);
});

test('[spec 3.3, 5.4, 6.3, 6.10] rejects invalid moves and rolls back a partial subtree move', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '800', '600']);
  dispatcher.dispatch(['create', 'g', 'scene']);
  dispatcher.dispatch(['create', 'rect', 'safe', '0', '0', '10', '10', 'in', 'scene']);
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
  dispatcher.dispatch(['create', 'rect', 'pending', '20', '20', '5', '5']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['rect#pending removed']);

  assert.throws(
    () => dispatcher.dispatch(['move', 'scene', '1e308', '0']),
    new DomainError('invalid number: Infinity'),
  );
  assert.throws(
    () => dispatcher.dispatch(['move', 'missing', '1', '1']),
    new DomainError('no such shape: missing'),
  );
  assert.throws(
    () => dispatcher.dispatch(['move', 'safe', 'nope', '1']),
    new DomainError('invalid number: nope'),
  );
  assert.throws(
    () => dispatcher.dispatch(['move', 'safe', '1']),
    new DomainError('usage: move <id> <dx> <dy>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['move', 'safe', '1', '2', '3']),
    new DomainError('usage: move <id> <dx> <dy>'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (800x600)',
    '└── g#scene',
    '    ├── rect#safe      x=0 y=0 w=10 h=10',
    '    └── line#overflow  (1e+308,0) -> (1e+308,0)',
  ]);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['rect#pending created']);
});

test('[spec 3.3, 6.3] requires a document before validating move arguments', () => {
  const dispatcher = createDispatcher();

  assert.throws(
    () => dispatcher.dispatch(['move', 'r', '1', '2']),
    new DomainError("no document. use 'init' or 'read' first"),
  );
});
