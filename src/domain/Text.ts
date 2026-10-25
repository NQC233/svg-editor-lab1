import { NumberFormatter } from '../shared/NumberFormatter.js';
import { LeafShape } from './LeafShape.js';

export class Text extends LeafShape {
  private readonly xValue: number;
  private readonly yValue: number;
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
