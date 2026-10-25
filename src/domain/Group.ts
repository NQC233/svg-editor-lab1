import { DomainError } from '../shared/DomainError.js';
import { Container } from './Container.js';
import type { ShapeAttributeSnapshot } from './ShapeAttributeSnapshot.js';

export class Group extends Container {
  public constructor(id: string) {
    super(id);
  }

  public override get type(): string {
    return 'g';
  }

  public override treeAttributes(): string {
    return '';
  }

  public override detailLines(): readonly string[] {
    return this.styleLines();
  }

  protected override setOwnAttribute(attribute: string, _value: string): ShapeAttributeSnapshot {
    throw new DomainError(`unknown attribute: ${attribute}`);
  }
}
