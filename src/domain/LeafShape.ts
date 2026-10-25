import { DomainError } from '../shared/DomainError.js';
import type { GeometrySnapshot } from './GeometrySnapshot.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import type { Point } from './Point.js';
import { Shape } from './Shape.js';

export abstract class LeafShape extends Shape {
  private readonly fillValue: string | undefined;
  private readonly strokeValue: string | undefined;

  protected constructor(id: string, fill?: string, stroke?: string) {
    super(id);
    LeafShape.assertOptionalText(fill, 'fill');
    LeafShape.assertOptionalText(stroke, 'stroke');
    this.fillValue = fill;
    this.strokeValue = stroke;
  }

  public get fill(): string | undefined {
    return this.fillValue;
  }

  public get stroke(): string | undefined {
    return this.strokeValue;
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

  protected styleLines(): readonly string[] {
    const attributes: string[] = [];
    if (this.fill !== undefined) {
      attributes.push(`fill=${this.fill}`);
    }

    if (this.stroke !== undefined) {
      attributes.push(`stroke=${this.stroke}`);
    }

    return attributes;
  }

  private static assertOptionalText(value: string | undefined, attribute: string): void {
    if (value !== undefined && value.length === 0) {
      throw new DomainError(`${attribute} must not be empty`);
    }
  }
}
