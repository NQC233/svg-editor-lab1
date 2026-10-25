import { NumberFormatter } from '../shared/NumberFormatter.js';
import { LeafShape } from './LeafShape.js';

export class Line extends LeafShape {
  private readonly startXValue: number;
  private readonly startYValue: number;
  private readonly endXValue: number;
  private readonly endYValue: number;

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
}
