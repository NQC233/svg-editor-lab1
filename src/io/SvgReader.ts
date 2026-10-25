import { readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';

import { Container } from '../domain/Container.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { Text } from '../domain/Text.js';
import { DomainError } from '../shared/DomainError.js';
import { NumberParser } from '../shared/NumberParser.js';
import type { XmlElement } from './XmlElement.js';
import { XmlParser } from './XmlParser.js';
import { SvgReadResult } from './SvgReadResult.js';
import { XmlText } from './XmlText.js';

const ROOT_ERROR = 'svg root width and height must be positive numbers';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export class SvgReader {
  public constructor(
    private readonly xmlParser: XmlParser,
    private readonly shapeFactory: ShapeFactory,
  ) {}

  public read(path: string): SvgReadResult {
    let bytes: Buffer;
    try {
      bytes = readFileSync(path);
    } catch {
      throw new DomainError(`cannot read file: ${path}`);
    }

    let source: string;
    try {
      source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new DomainError('invalid SVG: invalid UTF-8');
    }

    return this.parse(source);
  }

  public parse(source: string): SvgReadResult {
    const root = this.xmlParser.parse(source).root;
    if (root.name !== 'svg') {
      throw new DomainError('invalid SVG: root element must be svg');
    }

    this.validateRootAttributes(root);
    const width = this.readRootDimension(root, 'width');
    const height = this.readRootDimension(root, 'height');
    this.validateViewBox(root.attribute('viewBox'), width, height);

    const document = new SvgDocument(width, height);
    let elementCount = 0;
    for (const child of root.children) {
      if (child instanceof XmlText) {
        this.assertIgnorableText(child, 'svg');
        continue;
      }

      elementCount += this.appendElement(child, document);
    }

    return new SvgReadResult(document, elementCount);
  }

  private appendElement(element: XmlElement, document: SvgDocument, parent?: Container): number {
    if (!this.shapeFactory.isSvgElement(element.name)) {
      throw new DomainError(`unsupported element: ${element.name}`);
    }

    const id = element.attribute('id');
    if (id === undefined || id.length === 0) {
      throw new DomainError(`invalid SVG: missing id on ${element.name}`);
    }

    if (document.find(id) !== undefined) {
      throw new DomainError(`id already exists: ${id}`);
    }

    const attributes = new Map(element.attributes);
    const shape = this.shapeFactory.createFromSvg(element.name, id, attributes);
    if (shape instanceof Text) {
      this.setReadTextContent(shape, element);
    } else {
      this.validateNonTextContent(element, shape);
    }

    document.appendShape(shape, parent);
    if (!(shape instanceof Container)) {
      return 1;
    }

    let elementCount = 1;
    for (const child of element.children) {
      if (child instanceof XmlText) {
        continue;
      }

      elementCount += this.appendElement(child, document, shape);
    }

    return elementCount;
  }

  private setReadTextContent(shape: Text, element: XmlElement): void {
    for (const child of element.children) {
      if (!(child instanceof XmlText)) {
        throw new DomainError(`unsupported element: ${child.name}`);
      }
    }

    const content = element.children
      .filter((child): child is XmlText => child instanceof XmlText)
      .map((child) => child.value)
      .join('');
    shape.setAttribute('text', content);
  }

  private validateNonTextContent(element: XmlElement, shape: Shape): void {
    for (const child of element.children) {
      if (child instanceof XmlText) {
        this.assertIgnorableText(child, element.name);
        continue;
      }

      if (!(shape instanceof Container)) {
        throw new DomainError(`unsupported element: ${child.name}`);
      }
    }
  }

  private assertIgnorableText(text: XmlText, tag: string): void {
    if (!text.cdata && text.value.trim().length > 0) {
      throw new DomainError(`invalid SVG: unexpected text in ${tag}`);
    }
  }

  private validateRootAttributes(root: XmlElement): void {
    for (const [name, value] of root.attributes) {
      if (name === 'transform') {
        throw new DomainError('unsupported transform on svg');
      }

      if (name === 'style' || name.startsWith('on')) {
        throw new DomainError(`unsupported attribute: ${name}`);
      }

      if (name === 'xmlns' && value !== SVG_NAMESPACE) {
        throw new DomainError(`unsupported xmlns: ${value}`);
      }
    }
  }

  private readRootDimension(root: XmlElement, name: 'width' | 'height'): number {
    const value = root.attribute(name);
    if (value === undefined) {
      throw new DomainError(ROOT_ERROR);
    }

    let dimension: number;
    try {
      dimension = NumberParser.parse(value);
    } catch {
      throw new DomainError(ROOT_ERROR);
    }

    if (dimension <= 0) {
      throw new DomainError(ROOT_ERROR);
    }

    return dimension;
  }

  private validateViewBox(value: string | undefined, width: number, height: number): void {
    if (value === undefined) {
      return;
    }

    const tokens = value.trim().split(/\s*,\s*|\s+/);
    if (tokens.length !== 4) {
      throw new DomainError(`invalid viewBox: ${value}`);
    }

    let numbers: number[];
    try {
      numbers = tokens.map((token) => NumberParser.parse(token));
    } catch {
      throw new DomainError(`invalid viewBox: ${value}`);
    }

    if (numbers[0] !== 0 || numbers[1] !== 0 || numbers[2] !== width || numbers[3] !== height) {
      throw new DomainError(`unsupported viewBox: ${value}`);
    }
  }
}
