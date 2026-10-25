import { DomainError } from '../shared/DomainError.js';
import { NumberParser } from '../shared/NumberParser.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { ShapeUsageError } from './ShapeUsageError.js';
import { Text } from './Text.js';

export class ShapeFactory {
  private static readonly CIRCLE_SYNTAX = 'circle <id> <cx> <cy> <r> [fill]';
  private static readonly ELLIPSE_SYNTAX = 'ellipse <id> <cx> <cy> <rx> <ry> [fill]';
  private static readonly GROUP_SYNTAX = 'g <id>';
  private static readonly LINE_SYNTAX = 'line <id> <x1> <y1> <x2> <y2> [stroke]';
  private static readonly RECT_SYNTAX = 'rect <id> <x> <y> <w> <h> [fill]';
  private static readonly TEXT_SYNTAX = 'text <id> <x> <y> <content>';
  private static readonly SVG_COMMON_ATTRIBUTES = ['fill', 'stroke', 'stroke-width', 'id'] as const;
  private static readonly SVG_ELEMENTS = new Set([
    'circle',
    'ellipse',
    'g',
    'line',
    'rect',
    'text',
  ]);

  public create(type: string, id: string, args: readonly string[]): Shape {
    switch (type) {
      case 'circle':
        return this.createCircle(id, args);
      case 'ellipse':
        return this.createEllipse(id, args);
      case 'g':
        return this.createGroupFromArgs(id, args);
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

  public createGroup(id: string): Group {
    return new Group(id);
  }

  public isSvgElement(type: string): boolean {
    return ShapeFactory.SVG_ELEMENTS.has(type);
  }

  public createFromSvg(
    type: string,
    id: string,
    attributes: ReadonlyMap<string, string>,
    text: string = '',
  ): Shape {
    switch (type) {
      case 'circle':
        return this.createCircleFromSvg(id, attributes);
      case 'ellipse':
        return this.createEllipseFromSvg(id, attributes);
      case 'g':
        this.assertSvgAttributes(type, attributes, []);
        return this.applySvgStyle(new Group(id), attributes);
      case 'line':
        return this.createLineFromSvg(id, attributes);
      case 'rect':
        return this.createRectFromSvg(id, attributes);
      case 'text':
        return this.createTextFromSvg(id, attributes, text);
      default:
        throw new DomainError(`unsupported element: ${type}`);
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

  private createGroupFromArgs(id: string, args: readonly string[]): Group {
    if (args.length !== 0) {
      throw new ShapeUsageError(ShapeFactory.GROUP_SYNTAX);
    }

    return this.createGroup(id);
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

  private createCircleFromSvg(id: string, attributes: ReadonlyMap<string, string>): Circle {
    this.assertSvgAttributes('circle', attributes, ['cx', 'cy', 'r']);
    return this.applySvgStyle(
      new Circle(
        id,
        this.svgNumber(attributes, 'cx'),
        this.svgNumber(attributes, 'cy'),
        this.svgNumber(attributes, 'r'),
      ),
      attributes,
    );
  }

  private createEllipseFromSvg(id: string, attributes: ReadonlyMap<string, string>): Ellipse {
    this.assertSvgAttributes('ellipse', attributes, ['cx', 'cy', 'rx', 'ry']);
    return this.applySvgStyle(
      new Ellipse(
        id,
        this.svgNumber(attributes, 'cx'),
        this.svgNumber(attributes, 'cy'),
        this.svgNumber(attributes, 'rx'),
        this.svgNumber(attributes, 'ry'),
      ),
      attributes,
    );
  }

  private createLineFromSvg(id: string, attributes: ReadonlyMap<string, string>): Line {
    this.assertSvgAttributes('line', attributes, ['x1', 'y1', 'x2', 'y2']);
    return this.applySvgStyle(
      new Line(
        id,
        this.svgNumber(attributes, 'x1'),
        this.svgNumber(attributes, 'y1'),
        this.svgNumber(attributes, 'x2'),
        this.svgNumber(attributes, 'y2'),
      ),
      attributes,
    );
  }

  private createRectFromSvg(id: string, attributes: ReadonlyMap<string, string>): Rect {
    this.assertSvgAttributes('rect', attributes, ['x', 'y', 'width', 'height']);
    return this.applySvgStyle(
      new Rect(
        id,
        this.svgNumber(attributes, 'x'),
        this.svgNumber(attributes, 'y'),
        this.svgNumber(attributes, 'width'),
        this.svgNumber(attributes, 'height'),
      ),
      attributes,
    );
  }

  private createTextFromSvg(
    id: string,
    attributes: ReadonlyMap<string, string>,
    content: string,
  ): Text {
    this.assertSvgAttributes('text', attributes, ['x', 'y']);
    return this.applySvgStyle(
      new Text(id, this.svgNumber(attributes, 'x'), this.svgNumber(attributes, 'y'), content),
      attributes,
    );
  }

  private svgNumber(attributes: ReadonlyMap<string, string>, name: string): number {
    return NumberParser.parse(attributes.get(name) ?? '0');
  }

  private applySvgStyle<T extends Shape>(shape: T, attributes: ReadonlyMap<string, string>): T {
    for (const name of ['fill', 'stroke', 'stroke-width'] as const) {
      const value = attributes.get(name);
      if (value !== undefined) {
        shape.setAttribute(name, value);
      }
    }

    return shape;
  }

  private assertSvgAttributes(
    type: string,
    attributes: ReadonlyMap<string, string>,
    geometry: readonly string[],
  ): void {
    const supported = new Set([...ShapeFactory.SVG_COMMON_ATTRIBUTES, ...geometry]);
    for (const name of attributes.keys()) {
      if (name === 'transform') {
        throw new DomainError(`unsupported transform on ${type}`);
      }

      if (name === 'style' || name.startsWith('on')) {
        throw new DomainError(`unsupported attribute: ${name}`);
      }

      if (!supported.has(name)) {
        throw new DomainError(`unsupported attribute: ${name}`);
      }
    }
  }
}
