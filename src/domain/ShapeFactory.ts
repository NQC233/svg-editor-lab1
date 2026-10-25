import { DomainError } from '../shared/DomainError.js';
import { NumberParser } from '../shared/NumberParser.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { ShapeUsageError } from './ShapeUsageError.js';
import { Text } from './Text.js';

export class ShapeFactory {
  private static readonly CIRCLE_SYNTAX = 'circle <id> <cx> <cy> <r> [fill]';
  private static readonly ELLIPSE_SYNTAX = 'ellipse <id> <cx> <cy> <rx> <ry> [fill]';
  private static readonly LINE_SYNTAX = 'line <id> <x1> <y1> <x2> <y2> [stroke]';
  private static readonly RECT_SYNTAX = 'rect <id> <x> <y> <w> <h> [fill]';
  private static readonly TEXT_SYNTAX = 'text <id> <x> <y> <content>';

  public create(type: string, id: string, args: readonly string[]): Shape {
    switch (type) {
      case 'circle':
        return this.createCircle(id, args);
      case 'ellipse':
        return this.createEllipse(id, args);
      case 'line':
        return this.createLine(id, args);
      case 'rect':
        return this.createRect(id, args);
      case 'text':
        return this.createText(id, args);
      default:
        throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  private createCircle(id: string, args: readonly string[]): Circle {
    if (args.length < 3 || args.length > 4) {
      throw new ShapeUsageError(ShapeFactory.CIRCLE_SYNTAX);
    }

    const centerXToken = args[0];
    const centerYToken = args[1];
    const radiusToken = args[2];
    if (centerXToken === undefined || centerYToken === undefined || radiusToken === undefined) {
      throw new ShapeUsageError(ShapeFactory.CIRCLE_SYNTAX);
    }

    return new Circle(
      id,
      NumberParser.parse(centerXToken),
      NumberParser.parse(centerYToken),
      NumberParser.parse(radiusToken),
      args[3],
    );
  }

  private createEllipse(id: string, args: readonly string[]): Ellipse {
    if (args.length < 4 || args.length > 5) {
      throw new ShapeUsageError(ShapeFactory.ELLIPSE_SYNTAX);
    }

    const centerXToken = args[0];
    const centerYToken = args[1];
    const radiusXToken = args[2];
    const radiusYToken = args[3];
    if (
      centerXToken === undefined ||
      centerYToken === undefined ||
      radiusXToken === undefined ||
      radiusYToken === undefined
    ) {
      throw new ShapeUsageError(ShapeFactory.ELLIPSE_SYNTAX);
    }

    return new Ellipse(
      id,
      NumberParser.parse(centerXToken),
      NumberParser.parse(centerYToken),
      NumberParser.parse(radiusXToken),
      NumberParser.parse(radiusYToken),
      args[4],
    );
  }

  private createLine(id: string, args: readonly string[]): Line {
    if (args.length < 4 || args.length > 5) {
      throw new ShapeUsageError(ShapeFactory.LINE_SYNTAX);
    }

    const startXToken = args[0];
    const startYToken = args[1];
    const endXToken = args[2];
    const endYToken = args[3];
    if (
      startXToken === undefined ||
      startYToken === undefined ||
      endXToken === undefined ||
      endYToken === undefined
    ) {
      throw new ShapeUsageError(ShapeFactory.LINE_SYNTAX);
    }

    return new Line(
      id,
      NumberParser.parse(startXToken),
      NumberParser.parse(startYToken),
      NumberParser.parse(endXToken),
      NumberParser.parse(endYToken),
      args[4],
    );
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

  private createText(id: string, args: readonly string[]): Text {
    if (args.length !== 3) {
      throw new ShapeUsageError(ShapeFactory.TEXT_SYNTAX);
    }

    const xToken = args[0];
    const yToken = args[1];
    const content = args[2];
    if (xToken === undefined || yToken === undefined || content === undefined) {
      throw new ShapeUsageError(ShapeFactory.TEXT_SYNTAX);
    }

    return new Text(id, NumberParser.parse(xToken), NumberParser.parse(yToken), content);
  }
}
