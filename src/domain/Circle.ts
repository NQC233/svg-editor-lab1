import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { GeometrySnapshot } from './GeometrySnapshot.js';
import { LeafShape } from './LeafShape.js';
import { Point } from './Point.js';
import type { SvgAttribute } from './Shape.js';
import type { ShapeAttributeSnapshot } from './ShapeAttributeSnapshot.js';

export class Circle extends LeafShape {
  private centerXValue: number;
  private centerYValue: number;
  private radiusValue: number;

  public constructor(id: string, centerX: number, centerY: number, radius: number, fill?: string) {
    super(id, fill);
    LeafShape.assertFinite(centerX);
    LeafShape.assertFinite(centerY);
    LeafShape.assertFinite(radius);

    if (radius <= 0) {
      throw new DomainError('circle r must be positive');
    }

    this.centerXValue = centerX;
    this.centerYValue = centerY;
    this.radiusValue = radius;
  }

  public override get type(): string {
    return 'circle';
  }

  public get centerX(): number {
    return this.centerXValue;
  }

  public get centerY(): number {
    return this.centerYValue;
  }

  public get radius(): number {
    return this.radiusValue;
  }

  public override moveOwnGeometry(dx: number, dy: number): void {
    const centerX = this.centerXValue + dx;
    const centerY = this.centerYValue + dy;
    LeafShape.assertFinite(centerX);
    LeafShape.assertFinite(centerY);
    this.centerXValue = centerX;
    this.centerYValue = centerY;
  }

  public override scaleOwnGeometry(factor: number): void {
    const centerX = this.centerXValue * factor;
    const centerY = this.centerYValue * factor;
    const radius = this.radiusValue * factor;
    LeafShape.assertFinite(centerX);
    LeafShape.assertFinite(centerY);
    LeafShape.assertFinite(radius);

    if (radius <= 0) {
      throw new DomainError('circle r must be positive');
    }

    this.centerXValue = centerX;
    this.centerYValue = centerY;
    this.radiusValue = radius;
  }

  public override snapshotGeometry(): GeometrySnapshot {
    const centerX = this.centerXValue;
    const centerY = this.centerYValue;
    const radius = this.radiusValue;
    return new GeometrySnapshot(
      () => {
        this.centerXValue = centerX;
        this.centerYValue = centerY;
        this.radiusValue = radius;
      },
      () =>
        this.centerXValue === centerX &&
        this.centerYValue === centerY &&
        this.radiusValue === radius,
    );
  }

  public override movementAnchor(): Point {
    return new Point(this.centerX, this.centerY);
  }

  public override treeAttributes(): string {
    return [
      `cx=${NumberFormatter.format(this.centerX)}`,
      `cy=${NumberFormatter.format(this.centerY)}`,
      `r=${NumberFormatter.format(this.radius)}`,
      ...this.treeFillLines(),
    ].join(' ');
  }

  public override detailLines(): readonly string[] {
    return [this.svgGeometryText(), ...this.styleLines()];
  }

  protected override svgGeometryAttributes(): readonly SvgAttribute[] {
    return [
      ['cx', NumberFormatter.format(this.centerX)],
      ['cy', NumberFormatter.format(this.centerY)],
      ['r', NumberFormatter.format(this.radius)],
    ];
  }

  protected override setOwnAttribute(attribute: string, value: string): ShapeAttributeSnapshot {
    switch (attribute) {
      case 'cx':
        return this.setNumberAttribute(attribute, value, this.centerXValue, (next) => {
          this.centerXValue = next;
        });
      case 'cy':
        return this.setNumberAttribute(attribute, value, this.centerYValue, (next) => {
          this.centerYValue = next;
        });
      case 'r':
        return this.setNumberAttribute(attribute, value, this.radiusValue, (next) => {
          if (next <= 0) {
            throw new DomainError('circle r must be positive');
          }

          this.radiusValue = next;
        });
      default:
        throw new DomainError(`unknown attribute: ${attribute}`);
    }
  }
}
