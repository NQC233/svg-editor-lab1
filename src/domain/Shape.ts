import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { NumberParser } from '../shared/NumberParser.js';
import type { Point } from './Point.js';
import { ShapeAttributeSnapshot } from './ShapeAttributeSnapshot.js';
import type { Container } from './Container.js';

export type SvgAttribute = readonly [name: string, value: string];

export abstract class Shape {
  private readonly shapeId: string;
  private fillValue: string | undefined;
  private strokeValue: string | undefined;
  private strokeWidthValue: number | undefined;

  protected constructor(id: string, fill?: string, stroke?: string) {
    if (id.length === 0 || /\s/.test(id)) {
      throw new DomainError(`invalid id: ${id}`);
    }

    Shape.assertOptionalText(fill, 'fill');
    Shape.assertOptionalText(stroke, 'stroke');
    this.shapeId = id;
    this.fillValue = fill;
    this.strokeValue = stroke;
  }

  public get id(): string {
    return this.shapeId;
  }

  public get fill(): string | undefined {
    return this.fillValue;
  }

  public get stroke(): string | undefined {
    return this.strokeValue;
  }

  public get strokeWidth(): number | undefined {
    return this.strokeWidthValue;
  }

  public get label(): string {
    return `${this.type}#${this.id}`;
  }

  public abstract get type(): string;

  public isContainer(): this is Container {
    return false;
  }

  public svgAttributes(): readonly SvgAttribute[] {
    return [['id', this.id], ...this.svgGeometryAttributes(), ...this.styleAttributes()];
  }

  public svgTextContent(): string | undefined {
    return undefined;
  }

  public setAttribute(attribute: string, value: string): ShapeAttributeSnapshot {
    switch (attribute) {
      case 'fill':
        return this.setStyleText(attribute, value, this.fillValue, (next) => {
          this.fillValue = next;
        });
      case 'stroke':
        return this.setStyleText(attribute, value, this.strokeValue, (next) => {
          this.strokeValue = next;
        });
      case 'stroke-width':
        return this.setStrokeWidth(value);
      default:
        return this.setOwnAttribute(attribute, value);
    }
  }

  public movementAnchor(): Point | undefined {
    return undefined;
  }

  public abstract treeAttributes(): string;

  public abstract detailLines(): readonly string[];

  protected abstract setOwnAttribute(attribute: string, value: string): ShapeAttributeSnapshot;

  protected svgGeometryAttributes(): readonly SvgAttribute[] {
    return [];
  }

  protected svgGeometryText(): string {
    return this.svgGeometryAttributes()
      .map(([name, value]) => `${name}=${value}`)
      .join(' ');
  }

  protected styleLines(): readonly string[] {
    return this.styleAttributes().map(([name, value]) => `${name}=${value}`);
  }

  private styleAttributes(): readonly SvgAttribute[] {
    return [
      ...(this.fill === undefined ? [] : [['fill', this.fill] as const]),
      ...(this.stroke === undefined ? [] : [['stroke', this.stroke] as const]),
      ...(this.strokeWidth === undefined
        ? []
        : [['stroke-width', NumberFormatter.format(this.strokeWidth)] as const]),
    ];
  }

  protected treeFillLines(): readonly string[] {
    return this.fill === undefined ? [] : [`fill=${this.fill}`];
  }

  private setStyleText(
    attribute: string,
    value: string,
    current: string | undefined,
    write: (next: string | undefined) => void,
  ): ShapeAttributeSnapshot {
    Shape.assertOptionalText(value, attribute);
    const changed = current !== value;
    if (changed) {
      write(value);
    }

    return new ShapeAttributeSnapshot(attribute, changed, current, value, () => write(current));
  }

  private setStrokeWidth(value: string): ShapeAttributeSnapshot {
    const next = NumberParser.parse(value);
    if (next < 0) {
      throw new DomainError('stroke-width must be non-negative');
    }

    const current = this.strokeWidthValue;
    const changed = current !== next;
    if (changed) {
      this.strokeWidthValue = next;
    }

    return new ShapeAttributeSnapshot(
      'stroke-width',
      changed,
      current === undefined ? undefined : NumberFormatter.format(current),
      NumberFormatter.format(next),
      () => {
        this.strokeWidthValue = current;
      },
    );
  }

  private static assertOptionalText(value: string | undefined, attribute: string): void {
    if (value !== undefined && value.length === 0) {
      throw new DomainError(`${attribute} must not be empty`);
    }
  }
}
