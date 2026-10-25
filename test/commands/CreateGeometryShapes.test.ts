import assert from 'node:assert/strict';
import test from 'node:test';

import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.2, 5.5, 5.6, 6.1, 6.10] creates, displays, undoes, and redoes a circle', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  assert.deepEqual(dispatcher.dispatch(['create', 'circle', 'c1', '100', '80', '20', 'red']), [
    'circle#c1 created',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'c1']), [
    'circle#c1  parent=svg',
    '  cx=100 cy=80 r=20',
    '  fill=red',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '└── circle#c1  cx=100 cy=80 r=20 fill=red',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['circle#c1 removed']);
  assert.deepEqual(dispatcher.dispatch(['tree']), ['svg (400x200)']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['circle#c1 created']);
  assert.deepEqual(dispatcher.dispatch(['show', 'c1']), [
    'circle#c1  parent=svg',
    '  cx=100 cy=80 r=20',
    '  fill=red',
  ]);
});

test('[spec 3.1, 5.2, 5.5, 5.6, 6.1, 6.10] creates and restores an unfilled ellipse with float geometry', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  assert.deepEqual(dispatcher.dispatch(['create', 'ellipse', 'e1', '-1.5', '2.25', '30.5', '20']), [
    'ellipse#e1 created',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'e1']), [
    'ellipse#e1  parent=svg',
    '  cx=-1.5 cy=2.25 rx=30.5 ry=20',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '└── ellipse#e1  cx=-1.5 cy=2.25 rx=30.5 ry=20',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['ellipse#e1 removed']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['ellipse#e1 created']);
  assert.deepEqual(dispatcher.dispatch(['show', 'e1']), [
    'ellipse#e1  parent=svg',
    '  cx=-1.5 cy=2.25 rx=30.5 ry=20',
  ]);
});

test('[spec 3.1, 5.1, 5.2, 5.5, 5.6, 6.1, 6.10] creates and restores a line with an optional stroke', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  assert.deepEqual(
    dispatcher.dispatch(['create', 'line', 'edge', '-10', '2.5', '30', '40', '#0a0']),
    ['line#edge created'],
  );
  assert.deepEqual(dispatcher.dispatch(['show', 'edge']), [
    'line#edge  parent=svg',
    '  x1=-10 y1=2.5 x2=30 y2=40',
    '  stroke=#0a0',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '└── line#edge  (-10,2.5) -> (30,40)',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['line#edge removed']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['line#edge created']);
  assert.deepEqual(dispatcher.dispatch(['show', 'edge']), [
    'line#edge  parent=svg',
    '  x1=-10 y1=2.5 x2=30 y2=40',
    '  stroke=#0a0',
  ]);
});

test('[spec 3.1, 5.1, 5.2, 5.5, 5.6, 6.1] omits optional styles and aligns mixed tree rows', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  dispatcher.dispatch(['create', 'circle', 'c1', '0', '0', '1']);
  dispatcher.dispatch(['create', 'ellipse', 'e1', '2', '3', '4', '5']);
  dispatcher.dispatch(['create', 'line', 'l1', '0', '0', '10', '10']);

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '├── circle#c1   cx=0 cy=0 r=1',
    '├── ellipse#e1  cx=2 cy=3 rx=4 ry=5',
    '└── line#l1     (0,0) -> (10,10)',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'c1']), [
    'circle#c1  parent=svg',
    '  cx=0 cy=0 r=1',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'e1']), [
    'ellipse#e1  parent=svg',
    '  cx=2 cy=3 rx=4 ry=5',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'l1']), [
    'line#l1  parent=svg',
    '  x1=0 y1=0 x2=10 y2=10',
  ]);
});

test('[spec 3.3, 5.1, 5.2, 6.1] rejects invalid geometry shapes without changing the document', () => {
  const dispatcher = createDispatcher();
  dispatcher.dispatch(['init', '400', '200']);
  dispatcher.dispatch(['create', 'rect', 'base', '0', '0', '10', '10', 'red']);

  assert.throws(
    () => dispatcher.dispatch(['create', 'circle', 'zero', '0', '0', '0']),
    new DomainError('circle r must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'circle', 'bad-center', 'nope', '0', '1']),
    new DomainError('invalid number: nope'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'circle', 'empty-fill', '0', '0', '1', '']),
    new DomainError('fill must not be empty'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'circle', 'few', '0', '0']),
    new DomainError('usage: create circle <id> <cx> <cy> <r> [fill]'),
  );

  assert.throws(
    () => dispatcher.dispatch(['create', 'ellipse', 'zero-x', '0', '0', '0', '1']),
    new DomainError('ellipse rx must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'ellipse', 'negative-y', '0', '0', '1', '-1']),
    new DomainError('ellipse ry must be positive'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'ellipse', 'many', '0', '0', '1', '1', 'red', 'extra']),
    new DomainError('usage: create ellipse <id> <cx> <cy> <rx> <ry> [fill]'),
  );

  assert.throws(
    () => dispatcher.dispatch(['create', 'line', 'bad-end', '0', '0', 'NaN', '1']),
    new DomainError('invalid number: NaN'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'line', 'empty-stroke', '0', '0', '1', '1', '']),
    new DomainError('stroke must not be empty'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'line', 'few', '0', '0', '1']),
    new DomainError('usage: create line <id> <x1> <y1> <x2> <y2> [stroke]'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '└── rect#base  x=0 y=0 w=10 h=10 fill=red',
  ]);
});
