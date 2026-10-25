import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { LeafShape } from './LeafShape.js';

export class Rect extends LeafShape {
  private readonly xValue: number;
  private readonly yValue: number;
  private readonly widthValue: number;
  private readonly heightValue: number;

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
