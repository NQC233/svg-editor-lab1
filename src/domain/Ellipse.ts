import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { LeafShape } from './LeafShape.js';

export class Ellipse extends LeafShape {
  private readonly centerXValue: number;
  private readonly centerYValue: number;
  private readonly radiusXValue: number;
  private readonly radiusYValue: number;

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
