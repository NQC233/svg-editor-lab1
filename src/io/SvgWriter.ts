import { writeFileSync } from 'node:fs';

import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { XmlEscaper } from './XmlEscaper.js';

interface RenderedSvg {
  readonly content: string;
  readonly elementCount: number;
}

export class SvgWriter {
  public write(document: SvgDocument, path: string): number {
    const rendered = this.render(document);
    writeFileSync(path, rendered.content, 'utf8');
    return rendered.elementCount;
  }

  public serialize(document: SvgDocument): string {
    return this.render(document).content;
  }

  private render(document: SvgDocument): RenderedSvg {
    const width = NumberFormatter.format(document.width);
    const height = NumberFormatter.format(document.height);
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ];

    let elementCount = 0;
    for (const shape of document.rootShapes) {
      elementCount += this.appendShape(document, shape, 1, lines);
    }

    lines.push('</svg>');
    return {
      content: `${lines.join('\n')}\n`,
      elementCount,
    };
  }

  private appendShape(document: SvgDocument, shape: Shape, depth: number, lines: string[]): number {
    const indent = '  '.repeat(depth);
    const attributes = shape
      .svgAttributes()
      .map(([name, value]) => ` ${name}="${XmlEscaper.escape(value)}"`)
      .join('');
    const content = shape.svgTextContent();
    const children = document.childrenOf(shape);
    if (content !== undefined) {
      lines.push(
        `${indent}<${shape.type}${attributes}>${XmlEscaper.escape(content)}</${shape.type}>`,
      );
      return 1;
    }

    if (children.length === 0) {
      lines.push(`${indent}<${shape.type}${attributes}/>`);
      return 1;
    }

    lines.push(`${indent}<${shape.type}${attributes}>`);
    let elementCount = 1;
    for (const child of children) {
      elementCount += this.appendShape(document, child, depth + 1, lines);
    }

    lines.push(`${indent}</${shape.type}>`);
    return elementCount;
  }
}
