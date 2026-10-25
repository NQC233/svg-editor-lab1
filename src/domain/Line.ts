import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { Shape } from './Shape.js';

export class Line extends Shape {
  private readonly startXValue: number;
  private readonly startYValue: number;
  private readonly endXValue: number;
  private readonly endYValue: number;
  private readonly strokeValue: string | undefined;

  public constructor(
    id: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    stroke?: string,
  ) {
    super(id);
    Line.assertFinite(startX);
    Line.assertFinite(startY);
    Line.assertFinite(endX);
    Line.assertFinite(endY);

    if (stroke !== undefined && stroke.length === 0) {
      throw new DomainError('stroke must not be empty');
    }

    this.startXValue = startX;
    this.startYValue = startY;
    this.endXValue = endX;
    this.endYValue = endY;
    this.strokeValue = stroke;
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

  public get stroke(): string | undefined {
    return this.strokeValue;
  }

  public override treeAttributes(): string {
    return `(${NumberFormatter.format(this.startX)},${NumberFormatter.format(this.startY)}) -> (${NumberFormatter.format(this.endX)},${NumberFormatter.format(this.endY)})`;
  }

  public override detailLines(): readonly string[] {
    const lines = [
      [
        `x1=${NumberFormatter.format(this.startX)}`,
        `y1=${NumberFormatter.format(this.startY)}`,
        `x2=${NumberFormatter.format(this.endX)}`,
        `y2=${NumberFormatter.format(this.endY)}`,
      ].join(' '),
    ];

    if (this.stroke !== undefined) {
      lines.push(`stroke=${this.stroke}`);
    }

    return lines;
  }

  private static assertFinite(value: number): void {
    if (!Number.isFinite(value)) {
      throw new DomainError(`invalid number: ${NumberFormatter.format(value)}`);
    }
  }
}
