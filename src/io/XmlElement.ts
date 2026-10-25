import { XmlNode } from './XmlNode.js';
import type { XmlNodeVisitor } from './XmlNode.js';

export type XmlAttribute = readonly [name: string, value: string];

export class XmlElement extends XmlNode {
  private readonly childrenValue: XmlNode[] = [];

  public constructor(
    private readonly nameValue: string,
    attributes: readonly XmlAttribute[],
  ) {
    super();
    this.attributesValue = [...attributes];
  }

  private readonly attributesValue: readonly XmlAttribute[];

  public get name(): string {
    return this.nameValue;
  }

  public get attributes(): readonly XmlAttribute[] {
    return [...this.attributesValue];
  }

  public get children(): readonly XmlNode[] {
    return [...this.childrenValue];
  }

  public attribute(name: string): string | undefined {
    return this.attributesValue.find(([attribute]) => attribute === name)?.[1];
  }

  public appendChild(child: XmlNode): void {
    this.childrenValue.push(child);
  }

  public override accept<T>(visitor: XmlNodeVisitor<T>): T {
    return visitor.visitElement(this);
  }
}
