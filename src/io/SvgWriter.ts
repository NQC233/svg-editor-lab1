import { writeFileSync } from 'node:fs';

import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { XmlEscaper } from './XmlEscaper.js';

export class SvgWriter {
  public write(document: SvgDocument, path: string): void {
    writeFileSync(path, this.serialize(document), 'utf8');
  }

  public serialize(document: SvgDocument): string {
    const width = NumberFormatter.format(document.width);
    const height = NumberFormatter.format(document.height);
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ];

    for (const shape of document.rootShapes) {
      this.appendShape(document, shape, 1, lines);
    }

    lines.push('</svg>');
    return `${lines.join('\n')}\n`;
  }

  public elementCount(document: SvgDocument): number {
    let count = 0;
    const visit = (shape: Shape): void => {
      count += 1;
      for (const child of document.childrenOf(shape)) {
        visit(child);
      }
    };

    for (const shape of document.rootShapes) {
      visit(shape);
    }

    return count;
  }

  private appendShape(document: SvgDocument, shape: Shape, depth: number, lines: string[]): void {
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
      return;
    }

    if (children.length === 0) {
      lines.push(`${indent}<${shape.type}${attributes}/>`);
      return;
    }

    lines.push(`${indent}<${shape.type}${attributes}>`);
    for (const child of children) {
      this.appendShape(document, child, depth + 1, lines);
    }

    lines.push(`${indent}</${shape.type}>`);
  }
}
