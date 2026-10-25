import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { Shape } from './Shape.js';

export class Circle extends Shape {
  private readonly centerXValue: number;
  private readonly centerYValue: number;
  private readonly radiusValue: number;
  private readonly fillValue: string | undefined;

  public constructor(id: string, centerX: number, centerY: number, radius: number, fill?: string) {
    super(id);
    Circle.assertFinite(centerX);
    Circle.assertFinite(centerY);
    Circle.assertFinite(radius);

    if (radius <= 0) {
      throw new DomainError('circle r must be positive');
    }

    if (fill !== undefined && fill.length === 0) {
      throw new DomainError('fill must not be empty');
    }

    this.centerXValue = centerX;
    this.centerYValue = centerY;
    this.radiusValue = radius;
    this.fillValue = fill;
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

  public get fill(): string | undefined {
    return this.fillValue;
  }

  public override treeAttributes(): string {
    const attributes = [
      `cx=${NumberFormatter.format(this.centerX)}`,
      `cy=${NumberFormatter.format(this.centerY)}`,
      `r=${NumberFormatter.format(this.radius)}`,
    ];

    if (this.fill !== undefined) {
      attributes.push(`fill=${this.fill}`);
    }

    return attributes.join(' ');
  }

  public override detailLines(): readonly string[] {
    const lines = [
      [
        `cx=${NumberFormatter.format(this.centerX)}`,
        `cy=${NumberFormatter.format(this.centerY)}`,
        `r=${NumberFormatter.format(this.radius)}`,
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
