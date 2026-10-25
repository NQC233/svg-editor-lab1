import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { GeometrySnapshot } from './GeometrySnapshot.js';
import { LeafShape } from './LeafShape.js';
import { Point } from './Point.js';
import type { SvgAttribute } from './Shape.js';
import type { ShapeAttributeSnapshot } from './ShapeAttributeSnapshot.js';

export class Line extends LeafShape {
  private startXValue: number;
  private startYValue: number;
  private endXValue: number;
  private endYValue: number;

  public constructor(
    id: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    stroke?: string,
  ) {
    super(id, undefined, stroke);
    LeafShape.assertFinite(startX);
    LeafShape.assertFinite(startY);
    LeafShape.assertFinite(endX);
    LeafShape.assertFinite(endY);

    this.startXValue = startX;
    this.startYValue = startY;
    this.endXValue = endX;
    this.endYValue = endY;
  }

  public override get type(): string {
    return 'line';
  }

  public get startX(): number {
    return this.startXValue;
  }

  public get startY(): number {
    return this.startYValue;
  }

  public get endX(): number {
    return this.endXValue;
  }

  public get endY(): number {
    return this.endYValue;
  }

  public override moveOwnGeometry(dx: number, dy: number): void {
    const startX = this.startXValue + dx;
    const startY = this.startYValue + dy;
    const endX = this.endXValue + dx;
    const endY = this.endYValue + dy;
    LeafShape.assertFinite(startX);
    LeafShape.assertFinite(startY);
    LeafShape.assertFinite(endX);
    LeafShape.assertFinite(endY);
    this.startXValue = startX;
    this.startYValue = startY;
    this.endXValue = endX;
    this.endYValue = endY;
  }

  public override scaleOwnGeometry(factor: number): void {
    const startX = this.startXValue * factor;
    const startY = this.startYValue * factor;
    const endX = this.endXValue * factor;
    const endY = this.endYValue * factor;
    LeafShape.assertFinite(startX);
    LeafShape.assertFinite(startY);
    LeafShape.assertFinite(endX);
    LeafShape.assertFinite(endY);
    this.startXValue = startX;
    this.startYValue = startY;
    this.endXValue = endX;
    this.endYValue = endY;
  }

  public override snapshotGeometry(): GeometrySnapshot {
    const startX = this.startXValue;
    const startY = this.startYValue;
    const endX = this.endXValue;
    const endY = this.endYValue;
    return new GeometrySnapshot(
      () => {
        this.startXValue = startX;
        this.startYValue = startY;
        this.endXValue = endX;
        this.endYValue = endY;
      },
      () =>
        this.startXValue === startX &&
        this.startYValue === startY &&
        this.endXValue === endX &&
        this.endYValue === endY,
    );
  }

  public override movementAnchor(): Point {
    return new Point(this.startX, this.startY);
  }

  public override treeAttributes(): string {
    return `(${NumberFormatter.format(this.startX)},${NumberFormatter.format(this.startY)}) -> (${NumberFormatter.format(this.endX)},${NumberFormatter.format(this.endY)})`;
  }

  public override detailLines(): readonly string[] {
    return [
      [
        `x1=${NumberFormatter.format(this.startX)}`,
        `y1=${NumberFormatter.format(this.startY)}`,
        `x2=${NumberFormatter.format(this.endX)}`,
        `y2=${NumberFormatter.format(this.endY)}`,
      ].join(' '),
      ...this.styleLines(),
    ];
  }

  protected override svgGeometryAttributes(): readonly SvgAttribute[] {
    return [
      ['x1', NumberFormatter.format(this.startX)],
      ['y1', NumberFormatter.format(this.startY)],
      ['x2', NumberFormatter.format(this.endX)],
      ['y2', NumberFormatter.format(this.endY)],
    ];
  }

  protected override setOwnAttribute(attribute: string, value: string): ShapeAttributeSnapshot {
    switch (attribute) {
      case 'x1':
        return this.setNumberAttribute(attribute, value, this.startXValue, (next) => {
          this.startXValue = next;
        });
      case 'y1':
        return this.setNumberAttribute(attribute, value, this.startYValue, (next) => {
          this.startYValue = next;
        });
      case 'x2':
        return this.setNumberAttribute(attribute, value, this.endXValue, (next) => {
          this.endXValue = next;
        });
      case 'y2':
        return this.setNumberAttribute(attribute, value, this.endYValue, (next) => {
          this.endYValue = next;
        });
      default:
        throw new DomainError(`unknown attribute: ${attribute}`);
    }
  }
}
