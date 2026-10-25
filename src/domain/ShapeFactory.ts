import { DomainError } from '../shared/DomainError.js';
import { NumberParser } from '../shared/NumberParser.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { ShapeUsageError } from './ShapeUsageError.js';

export class ShapeFactory {
  private static readonly RECT_SYNTAX = 'rect <id> <x> <y> <w> <h> [fill]';

  public create(type: string, id: string, args: readonly string[]): Shape {
    switch (type) {
      case 'rect':
        return this.createRect(id, args);
      default:
        throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  private createRect(id: string, args: readonly string[]): Rect {
    if (args.length < 4 || args.length > 5) {
      throw new ShapeUsageError(ShapeFactory.RECT_SYNTAX);
    }

    const xToken = args[0];
    const yToken = args[1];
    const widthToken = args[2];
    const heightToken = args[3];
    if (
      xToken === undefined ||
      yToken === undefined ||
      widthToken === undefined ||
      heightToken === undefined
    ) {
      throw new ShapeUsageError(ShapeFactory.RECT_SYNTAX);
    }

    return new Rect(
      id,
      NumberParser.parse(xToken),
      NumberParser.parse(yToken),
      NumberParser.parse(widthToken),
      NumberParser.parse(heightToken),
      args[4],
    );
  }
}
