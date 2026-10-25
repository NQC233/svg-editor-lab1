import { NumberFormatter } from '../shared/NumberFormatter.js';
import { GeometrySnapshot } from './GeometrySnapshot.js';
import { LeafShape } from './LeafShape.js';
import { Point } from './Point.js';

export class Text extends LeafShape {
  private xValue: number;
  private yValue: number;
  private readonly contentValue: string;

  public constructor(id: string, x: number, y: number, content: string) {
    super(id);
    LeafShape.assertFinite(x);
    LeafShape.assertFinite(y);
    this.xValue = x;
    this.yValue = y;
    this.contentValue = content;
  }

  public override get type(): string {
    return 'text';
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get content(): string {
    return this.contentValue;
  }

  public override moveOwnGeometry(dx: number, dy: number): void {
    const x = this.xValue + dx;
    const y = this.yValue + dy;
    LeafShape.assertFinite(x);
    LeafShape.assertFinite(y);
    this.xValue = x;
    this.yValue = y;
  }

  public override scaleOwnGeometry(factor: number): void {
    const x = this.xValue * factor;
    const y = this.yValue * factor;
    LeafShape.assertFinite(x);
    LeafShape.assertFinite(y);
    this.xValue = x;
    this.yValue = y;
  }

  public override snapshotGeometry(): GeometrySnapshot {
    const x = this.xValue;
    const y = this.yValue;
    return new GeometrySnapshot(
      () => {
        this.xValue = x;
        this.yValue = y;
      },
      () => this.xValue === x && this.yValue === y,
    );
  }

  public override movementAnchor(): Point {
    return new Point(this.x, this.y);
  }

  public override treeAttributes(): string {
    return `(${NumberFormatter.format(this.x)},${NumberFormatter.format(this.y)}) ${this.quotedContent()}`;
  }

  public override detailLines(): readonly string[] {
    return [
      `x=${NumberFormatter.format(this.x)} y=${NumberFormatter.format(this.y)}`,
      `text=${this.quotedContent()}`,
    ];
  }

  private quotedContent(): string {
    return JSON.stringify(this.content);
  }
}
