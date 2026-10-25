import assert from 'node:assert/strict';
import test from 'node:test';

import { CommandToken } from '../../src/commands/CommandToken.js';
import { DomainError } from '../../src/shared/DomainError.js';
import { createDispatcher } from '../support/createDispatcher.js';

test('[spec 5.2, 5.5, 5.6, 6.1, 6.10] creates, displays, undoes, and redoes text', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  assert.deepEqual(dispatcher.dispatch(['create', 'text', 'title', '20', '40', 'My Diagram']), [
    'text#title created',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'title']), [
    'text#title  parent=svg',
    '  x=20 y=40',
    '  text="My Diagram"',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '└── text#title  (20,40) "My Diagram"',
  ]);

  assert.deepEqual(dispatcher.dispatch(['undo']), ['text#title removed']);
  assert.deepEqual(dispatcher.dispatch(['tree']), ['svg (400x200)']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['text#title created']);
  assert.deepEqual(dispatcher.dispatch(['show', 'title']), [
    'text#title  parent=svg',
    '  x=20 y=40',
    '  text="My Diagram"',
  ]);
});

test('[spec 3.1, 4.2, 5.2, 5.5, 5.6, 6.1] preserves Chinese, empty, and keyword-like text', () => {
  const dispatcher = createDispatcher();

  dispatcher.dispatch(['init', '400', '200']);
  dispatcher.dispatch(['create', 'text', 'label', '-1.5', '2.25', '开始']);
  dispatcher.dispatch(['create', 'text', 'empty', '0', '0', '']);
  dispatcher.dispatchTokens([
    new CommandToken('create'),
    new CommandToken('text'),
    new CommandToken('keyword'),
    new CommandToken('1'),
    new CommandToken('2'),
    new CommandToken('in', true),
  ]);

  assert.deepEqual(dispatcher.dispatch(['show', 'label']), [
    'text#label  parent=svg',
    '  x=-1.5 y=2.25',
    '  text="开始"',
  ]);
  assert.deepEqual(dispatcher.dispatch(['tree', 'label']), ['text#label  (-1.5,2.25) "开始"']);
  assert.deepEqual(dispatcher.dispatch(['show', 'empty']), [
    'text#empty  parent=svg',
    '  x=0 y=0',
    '  text=""',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'keyword']), [
    'text#keyword  parent=svg',
    '  x=1 y=2',
    '  text="in"',
  ]);
});

test('[spec 4.2, 5.5, 5.6] escapes quotes and backslashes as JSON strings', () => {
  const dispatcher = createDispatcher();
  const content = 'say "hi" \\path';

  dispatcher.dispatch(['init', '400', '200']);
  dispatcher.dispatch(['create', 'text', 'quoted', '10', '20', content]);

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '└── text#quoted  (10,20) "say \\"hi\\" \\\\path"',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'quoted']), [
    'text#quoted  parent=svg',
    '  x=10 y=20',
    '  text="say \\"hi\\" \\\\path"',
  ]);
});

test('[spec 5.5, 5.6] escapes newlines and control characters as JSON strings', () => {
  const dispatcher = createDispatcher();
  const content = '第一行\n第二行\tend';

  dispatcher.dispatch(['init', '400', '200']);
  dispatcher.dispatch(['create', 'text', 'multiline', '1', '2', content]);

  assert.deepEqual(dispatcher.dispatch(['tree']), [
    'svg (400x200)',
    '└── text#multiline  (1,2) "第一行\\n第二行\\tend"',
  ]);
  assert.deepEqual(dispatcher.dispatch(['show', 'multiline']), [
    'text#multiline  parent=svg',
    '  x=1 y=2',
    '  text="第一行\\n第二行\\tend"',
  ]);
});

test('[spec 3.3, 5.2, 6.1] rejects invalid text without changing the document or history', () => {
  const dispatcher = createDispatcher();
  dispatcher.dispatch(['init', '400', '200']);
  dispatcher.dispatch(['create', 'text', 'base', '0', '0', 'base']);
  dispatcher.dispatch(['create', 'text', 'temporary', '1', '1', 'temporary']);
  assert.deepEqual(dispatcher.dispatch(['undo']), ['text#temporary removed']);

  assert.throws(
    () => dispatcher.dispatch(['create', 'text', 'bad-x', 'nope', '0', 'content']),
    new DomainError('invalid number: nope'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'text', 'few', '0', '0']),
    new DomainError('usage: create text <id> <x> <y> <content>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'text', 'many', '0', '0', 'content', 'extra']),
    new DomainError('usage: create text <id> <x> <y> <content>'),
  );
  assert.throws(
    () => dispatcher.dispatch(['create', 'text', 'base', '2', '2', 'duplicate']),
    new DomainError('id already exists: base'),
  );

  assert.deepEqual(dispatcher.dispatch(['tree']), ['svg (400x200)', '└── text#base  (0,0) "base"']);
  assert.deepEqual(dispatcher.dispatch(['redo']), ['text#temporary created']);
});
