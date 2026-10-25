import { readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';

import type { Container } from '../domain/Container.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { DomainError } from '../shared/DomainError.js';
import { NumberParser } from '../shared/NumberParser.js';
import type { XmlElement } from './XmlElement.js';
import { XmlParser } from './XmlParser.js';
import { SvgReadResult } from './SvgReadResult.js';
import type { XmlText } from './XmlText.js';

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
    return new SvgReadResult(document, this.appendElementChildren(root, document));
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
    const shape = this.shapeFactory.createFromSvg(
      element.name,
      id,
      attributes,
      this.readDirectText(element),
    );
    if (shape.svgTextContent() !== undefined) {
      this.assertTextOnly(element);
    } else {
      this.validateNonTextContent(element, shape);
    }

    document.appendShape(shape, parent);
    if (!shape.isContainer()) {
      return 1;
    }

    return 1 + this.appendElementChildren(element, document, shape);
  }

  private appendElementChildren(
    element: XmlElement,
    document: SvgDocument,
    parent?: Container,
  ): number {
    let elementCount = 0;
    for (const child of element.children) {
      elementCount += child.accept({
        visitElement: (childElement) => this.appendElement(childElement, document, parent),
        visitText: (text) => {
          this.assertIgnorableText(text, element.name);
          return 0;
        },
      });
    }

    return elementCount;
  }

  private validateNonTextContent(element: XmlElement, shape: Shape): void {
    for (const child of element.children) {
      child.accept({
        visitElement: (childElement) => {
          if (!shape.isContainer()) {
            throw new DomainError(`unsupported element: ${childElement.name}`);
          }
        },
        visitText: (text) => this.assertIgnorableText(text, element.name),
      });
    }
  }

  private assertTextOnly(element: XmlElement): void {
    for (const child of element.children) {
      child.accept({
        visitElement: (childElement) => {
          throw new DomainError(`unsupported element: ${childElement.name}`);
        },
        visitText: () => undefined,
      });
    }
  }

  private readDirectText(element: XmlElement): string {
    return element.children
      .map((child) =>
        child.accept({
          visitElement: () => '',
          visitText: (text) => text.value,
        }),
      )
      .join('');
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
