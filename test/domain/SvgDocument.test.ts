import assert from 'node:assert/strict';
import test from 'node:test';

import { Group } from '../../src/domain/Group.js';
import { Rect } from '../../src/domain/Rect.js';
import { DomainError } from '../../src/shared/DomainError.js';

test('[spec 6.1] rejects container structure changes without the document capability', () => {
  const group = new Group('scene');
  const rectangle = new Rect('r1', 0, 0, 10, 10);

  assert.throws(
    () => group.insertChild(rectangle, 0, Symbol('not-document')),
    new DomainError('container structure must be changed through SvgDocument'),
  );
  assert.deepEqual(group.children, []);
});
