import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { Shape } from './Shape.js';

export class Rect extends Shape {
  private readonly xValue: number;
  private readonly yValue: number;
  private readonly widthValue: number;
  private readonly heightValue: number;
  private readonly fillValue: string | undefined;

  public constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
  ) {
    super(id);
    Rect.assertFinite(x);
    Rect.assertFinite(y);
    Rect.assertFinite(width);
    Rect.assertFinite(height);

    if (width <= 0) {
      throw new DomainError('rect width must be positive');
    }

    if (height <= 0) {
      throw new DomainError('rect height must be positive');
    }

    if (fill !== undefined && fill.length === 0) {
      throw new DomainError('fill must not be empty');
    }

    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
    this.fillValue = fill;
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

  public get fill(): string | undefined {
    return this.fillValue;
  }

  public override treeAttributes(): string {
    const attributes = [
      `x=${NumberFormatter.format(this.x)}`,
      `y=${NumberFormatter.format(this.y)}`,
      `w=${NumberFormatter.format(this.width)}`,
      `h=${NumberFormatter.format(this.height)}`,
    ];

    if (this.fill !== undefined) {
      attributes.push(`fill=${this.fill}`);
    }

    return attributes.join(' ');
  }

  public override detailLines(): readonly string[] {
    const lines = [
      [
        `x=${NumberFormatter.format(this.x)}`,
        `y=${NumberFormatter.format(this.y)}`,
        `width=${NumberFormatter.format(this.width)}`,
        `height=${NumberFormatter.format(this.height)}`,
      ].join(' '),
    ];

    if (this.fill !== undefined) {
      lines.push(`fill=${this.fill}`);
    }

    return lines;
  }

  private static assertFinite(value: number): void {
    if (!Number.isFinite(value)) {
      throw new DomainError(`invalid number: ${NumberFormatter.format(value)}`);
    }
  }
}
