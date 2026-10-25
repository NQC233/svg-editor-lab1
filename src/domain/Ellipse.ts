import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { GeometrySnapshot } from './GeometrySnapshot.js';
import { LeafShape } from './LeafShape.js';

export class Ellipse extends LeafShape {
  private centerXValue: number;
  private centerYValue: number;
  private radiusXValue: number;
  private radiusYValue: number;

  public constructor(
    id: string,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    fill?: string,
  ) {
    super(id, fill);
    LeafShape.assertFinite(centerX);
    LeafShape.assertFinite(centerY);
    LeafShape.assertFinite(radiusX);
    LeafShape.assertFinite(radiusY);

    if (radiusX <= 0) {
      throw new DomainError('ellipse rx must be positive');
    }

    if (radiusY <= 0) {
      throw new DomainError('ellipse ry must be positive');
    }

    this.centerXValue = centerX;
    this.centerYValue = centerY;
    this.radiusXValue = radiusX;
    this.radiusYValue = radiusY;
  }

  public override get type(): string {
    return 'ellipse';
  }

  public get centerX(): number {
    return this.centerXValue;
  }

  public get centerY(): number {
    return this.centerYValue;
  }

  public get radiusX(): number {
    return this.radiusXValue;
  }

  public get radiusY(): number {
    return this.radiusYValue;
  }

  public override moveOwnGeometry(dx: number, dy: number): void {
    const centerX = this.centerXValue + dx;
    const centerY = this.centerYValue + dy;
    LeafShape.assertFinite(centerX);
    LeafShape.assertFinite(centerY);
    this.centerXValue = centerX;
    this.centerYValue = centerY;
  }

  public override snapshotGeometry(): GeometrySnapshot {
    const centerX = this.centerXValue;
    const centerY = this.centerYValue;
    const radiusX = this.radiusXValue;
    const radiusY = this.radiusYValue;
    return new GeometrySnapshot(() => {
      this.centerXValue = centerX;
      this.centerYValue = centerY;
      this.radiusXValue = radiusX;
      this.radiusYValue = radiusY;
    });
  }

  public override movedMessage(_dx: number, _dy: number): string {
    return `${this.label} moved to (${NumberFormatter.format(this.centerX)},${NumberFormatter.format(this.centerY)})`;
  }

  public override moveBackMessage(_dx: number, _dy: number): string {
    return `${this.label} moved back to (${NumberFormatter.format(this.centerX)},${NumberFormatter.format(this.centerY)})`;
  }

  public override treeAttributes(): string {
    return [
      `cx=${NumberFormatter.format(this.centerX)}`,
      `cy=${NumberFormatter.format(this.centerY)}`,
      `rx=${NumberFormatter.format(this.radiusX)}`,
      `ry=${NumberFormatter.format(this.radiusY)}`,
      ...this.styleLines(),
    ].join(' ');
  }

  public override detailLines(): readonly string[] {
    return [
      [
        `cx=${NumberFormatter.format(this.centerX)}`,
        `cy=${NumberFormatter.format(this.centerY)}`,
        `rx=${NumberFormatter.format(this.radiusX)}`,
        `ry=${NumberFormatter.format(this.radiusY)}`,
      ].join(' '),
      ...this.styleLines(),
    ];
  }
}
