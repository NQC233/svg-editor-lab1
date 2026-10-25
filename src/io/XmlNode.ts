import type { XmlElement } from './XmlElement.js';
import type { XmlText } from './XmlText.js';

export interface XmlNodeVisitor<T> {
  visitElement(element: XmlElement): T;
  visitText(text: XmlText): T;
}

export abstract class XmlNode {
  public abstract accept<T>(visitor: XmlNodeVisitor<T>): T;
}
