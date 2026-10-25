import type { Shape } from '../domain/Shape.js';

export class ShowFormatter {
  public format(shape: Shape, parentLabel: string): readonly string[] {
    return [
      `${shape.label}  parent=${parentLabel}`,
      ...shape.detailLines().map((line) => `  ${line}`),
    ];
  }
}
