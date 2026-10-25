import { DomainError } from '../shared/DomainError.js';
import type { GeometrySnapshot } from './GeometrySnapshot.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { NumberParser } from '../shared/NumberParser.js';
import type { Point } from './Point.js';
import { Shape } from './Shape.js';
import { ShapeAttributeSnapshot } from './ShapeAttributeSnapshot.js';
import type { UnmodeledAttributes } from './UnmodeledAttributes.js';

export abstract class LeafShape extends Shape {
  protected constructor(
    id: string,
    fill?: string,
    stroke?: string,
    unmodeledAttributes?: UnmodeledAttributes,
  ) {
    super(id, fill, stroke, unmodeledAttributes);
  }

  public abstract override movementAnchor(): Point;

  public abstract moveOwnGeometry(dx: number, dy: number): void;

  public abstract scaleOwnGeometry(factor: number): void;

  public abstract snapshotGeometry(): GeometrySnapshot;

  protected static assertFinite(value: number): void {
    if (!Number.isFinite(value)) {
      throw new DomainError(`invalid number: ${NumberFormatter.format(value)}`);
    }
  }

  protected setNumberAttribute(
    attribute: string,
    value: string,
    current: number,
    write: (next: number) => void,
  ): ShapeAttributeSnapshot {
    const next = NumberParser.parse(value);
    const changed = current !== next;
    if (changed) {
      write(next);
    }

    return new ShapeAttributeSnapshot(
      attribute,
      changed,
      NumberFormatter.format(current),
      NumberFormatter.format(next),
      () => write(current),
    );
  }
}
