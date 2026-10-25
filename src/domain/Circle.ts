import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { GeometrySnapshot } from './GeometrySnapshot.js';
import { LeafShape } from './LeafShape.js';

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

  public override snapshotGeometry(): GeometrySnapshot {
    const centerX = this.centerXValue;
    const centerY = this.centerYValue;
    const radius = this.radiusValue;
    return new GeometrySnapshot(() => {
      this.centerXValue = centerX;
      this.centerYValue = centerY;
      this.radiusValue = radius;
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
      `r=${NumberFormatter.format(this.radius)}`,
      ...this.styleLines(),
    ].join(' ');
  }

  public override detailLines(): readonly string[] {
    return [
      [
        `cx=${NumberFormatter.format(this.centerX)}`,
        `cy=${NumberFormatter.format(this.centerY)}`,
        `r=${NumberFormatter.format(this.radius)}`,
      ].join(' '),
      ...this.styleLines(),
    ];
  }
}
