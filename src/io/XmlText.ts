import { XmlNode } from './XmlNode.js';
import type { XmlNodeVisitor } from './XmlNode.js';

export class XmlText extends XmlNode {
  public constructor(
    private readonly valueValue: string,
    private readonly cdataValue: boolean = false,
  ) {
    super();
  }

  public get value(): string {
    return this.valueValue;
  }

  public get cdata(): boolean {
    return this.cdataValue;
  }

  public override accept<T>(visitor: XmlNodeVisitor<T>): T {
    return visitor.visitText(this);
  }
}
