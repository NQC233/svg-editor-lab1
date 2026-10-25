import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { LeafShape } from './LeafShape.js';

export class Circle extends LeafShape {
  private readonly centerXValue: number;
  private readonly centerYValue: number;
  private readonly radiusValue: number;

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
