import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { DisplayWidth } from './DisplayWidth.js';

export class TreeFormatter {
  public formatDocument(document: SvgDocument): readonly string[] {
    const lines = [
      `svg (${NumberFormatter.format(document.width)}x${NumberFormatter.format(document.height)})`,
    ];
    this.appendRootShapes(lines, document.rootShapes);
    return lines;
  }

  public formatShape(shape: Shape): readonly string[] {
    return [this.formatShapeLine(shape, '', DisplayWidth.measure(shape.label))];
  }

  private appendRootShapes(lines: string[], shapes: readonly Shape[]): void {
    const labelWidth = shapes.reduce(
      (width, shape) => Math.max(width, DisplayWidth.measure(shape.label)),
      0,
    );

    shapes.forEach((shape, index) => {
      const branch = index === shapes.length - 1 ? '└── ' : '├── ';
      lines.push(this.formatShapeLine(shape, branch, labelWidth));
    });
  }

  private formatShapeLine(shape: Shape, prefix: string, labelWidth: number): string {
    const attributes = shape.treeAttributes();
    const label =
      attributes.length === 0 ? shape.label : DisplayWidth.padEnd(shape.label, labelWidth + 2);
    return `${prefix}${label}${attributes}`;
  }
}
