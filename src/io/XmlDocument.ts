import type { XmlElement } from './XmlElement.js';

export class XmlDocument {
  public constructor(private readonly rootValue: XmlElement) {}

  public get root(): XmlElement {
    return this.rootValue;
  }
}
