import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { Shape } from './Shape.js';

export class Ellipse extends Shape {
  private readonly centerXValue: number;
  private readonly centerYValue: number;
  private readonly radiusXValue: number;
  private readonly radiusYValue: number;
  private readonly fillValue: string | undefined;

  public constructor(
    id: string,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    fill?: string,
  ) {
    super(id);
    Ellipse.assertFinite(centerX);
    Ellipse.assertFinite(centerY);
    Ellipse.assertFinite(radiusX);
    Ellipse.assertFinite(radiusY);

    if (radiusX <= 0) {
      throw new DomainError('ellipse rx must be positive');
    }

    if (radiusY <= 0) {
      throw new DomainError('ellipse ry must be positive');
    }

    if (fill !== undefined && fill.length === 0) {
      throw new DomainError('fill must not be empty');
    }

    this.centerXValue = centerX;
    this.centerYValue = centerY;
    this.radiusXValue = radiusX;
    this.radiusYValue = radiusY;
    this.fillValue = fill;
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

  public get fill(): string | undefined {
    return this.fillValue;
  }

  public override treeAttributes(): string {
    const attributes = [
      `cx=${NumberFormatter.format(this.centerX)}`,
      `cy=${NumberFormatter.format(this.centerY)}`,
      `rx=${NumberFormatter.format(this.radiusX)}`,
      `ry=${NumberFormatter.format(this.radiusY)}`,
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
        `rx=${NumberFormatter.format(this.radiusX)}`,
        `ry=${NumberFormatter.format(this.radiusY)}`,
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
