import type { XmlNode } from './XmlNode.js';

export type XmlAttribute = readonly [name: string, value: string];

export class XmlElement {
  private readonly childrenValue: XmlNode[] = [];

  public constructor(
    private readonly nameValue: string,
    attributes: readonly XmlAttribute[],
  ) {
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
}
