import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { GeometrySnapshot } from './GeometrySnapshot.js';
import { LeafShape } from './LeafShape.js';

export class Rect extends LeafShape {
  private xValue: number;
  private yValue: number;
  private widthValue: number;
  private heightValue: number;

  public constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
  ) {
    super(id, fill);
    LeafShape.assertFinite(x);
    LeafShape.assertFinite(y);
    LeafShape.assertFinite(width);
    LeafShape.assertFinite(height);

    if (width <= 0) {
      throw new DomainError('rect width must be positive');
    }

    if (height <= 0) {
      throw new DomainError('rect height must be positive');
    }

    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
  }

  public override get type(): string {
    return 'rect';
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  public override moveOwnGeometry(dx: number, dy: number): void {
    const x = this.xValue + dx;
    const y = this.yValue + dy;
    LeafShape.assertFinite(x);
    LeafShape.assertFinite(y);
    this.xValue = x;
    this.yValue = y;
  }

  public override snapshotGeometry(): GeometrySnapshot {
    const x = this.xValue;
    const y = this.yValue;
    const width = this.widthValue;
    const height = this.heightValue;
    return new GeometrySnapshot(() => {
      this.xValue = x;
      this.yValue = y;
      this.widthValue = width;
      this.heightValue = height;
    });
  }

  public override movedMessage(_dx: number, _dy: number): string {
    return `${this.label} moved to (${NumberFormatter.format(this.x)},${NumberFormatter.format(this.y)})`;
  }

  public override moveBackMessage(_dx: number, _dy: number): string {
    return `${this.label} moved back to (${NumberFormatter.format(this.x)},${NumberFormatter.format(this.y)})`;
  }

  public override treeAttributes(): string {
    return [
      `x=${NumberFormatter.format(this.x)}`,
      `y=${NumberFormatter.format(this.y)}`,
      `w=${NumberFormatter.format(this.width)}`,
      `h=${NumberFormatter.format(this.height)}`,
      ...this.styleLines(),
    ].join(' ');
  }

  public override detailLines(): readonly string[] {
    return [
      [
        `x=${NumberFormatter.format(this.x)}`,
        `y=${NumberFormatter.format(this.y)}`,
        `width=${NumberFormatter.format(this.width)}`,
        `height=${NumberFormatter.format(this.height)}`,
      ].join(' '),
      ...this.styleLines(),
    ];
  }
}
