import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { GeometrySnapshot } from './GeometrySnapshot.js';
import { LeafShape } from './LeafShape.js';
import { Point } from './Point.js';
import type { SvgAttribute } from './Shape.js';
import type { ShapeAttributeSnapshot } from './ShapeAttributeSnapshot.js';
import type { UnmodeledAttributes } from './UnmodeledAttributes.js';

export class Rect extends LeafShape {
  private xValue: number;
  private yValue: number;
  private widthValue: number;
  private heightValue: number;

  public constructor(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    fill?: string,
    unmodeledAttributes?: UnmodeledAttributes,
  ) {
    super(id, fill, undefined, unmodeledAttributes);
    LeafShape.assertFinite(x);
    LeafShape.assertFinite(y);
    LeafShape.assertFinite(width);
    LeafShape.assertFinite(height);

    if (width <= 0) {
      throw new DomainError('rect width must be positive');
    }

    if (height <= 0) {
      throw new DomainError('rect height must be positive');
    }

    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
  }

  public override get type(): string {
    return 'rect';
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  public override moveOwnGeometry(dx: number, dy: number): void {
    const x = this.xValue + dx;
    const y = this.yValue + dy;
    LeafShape.assertFinite(x);
    LeafShape.assertFinite(y);
    this.xValue = x;
    this.yValue = y;
  }

  public override scaleOwnGeometry(factor: number): void {
    const x = this.xValue * factor;
    const y = this.yValue * factor;
    const width = this.widthValue * factor;
    const height = this.heightValue * factor;
    LeafShape.assertFinite(x);
    LeafShape.assertFinite(y);
    LeafShape.assertFinite(width);
    LeafShape.assertFinite(height);

    if (width <= 0) {
      throw new DomainError('rect width must be positive');
    }

    if (height <= 0) {
      throw new DomainError('rect height must be positive');
    }

    this.xValue = x;
    this.yValue = y;
    this.widthValue = width;
    this.heightValue = height;
  }

  public override snapshotGeometry(): GeometrySnapshot {
    const x = this.xValue;
    const y = this.yValue;
    const width = this.widthValue;
    const height = this.heightValue;
    return new GeometrySnapshot(
      () => {
        this.xValue = x;
        this.yValue = y;
        this.widthValue = width;
        this.heightValue = height;
      },
      () =>
        this.xValue === x &&
        this.yValue === y &&
        this.widthValue === width &&
        this.heightValue === height,
    );
  }

  public override movementAnchor(): Point {
    return new Point(this.x, this.y);
  }

  public override treeAttributes(): string {
    return [
      `x=${NumberFormatter.format(this.x)}`,
      `y=${NumberFormatter.format(this.y)}`,
      `w=${NumberFormatter.format(this.width)}`,
      `h=${NumberFormatter.format(this.height)}`,
      ...this.treeFillLines(),
    ].join(' ');
  }

  public override detailLines(): readonly string[] {
    return [this.svgGeometryText(), ...this.styleLines()];
  }

  protected override svgGeometryAttributes(): readonly SvgAttribute[] {
    return [
      ['x', NumberFormatter.format(this.x)],
      ['y', NumberFormatter.format(this.y)],
      ['width', NumberFormatter.format(this.width)],
      ['height', NumberFormatter.format(this.height)],
    ];
  }

  protected override setOwnAttribute(attribute: string, value: string): ShapeAttributeSnapshot {
    switch (attribute) {
      case 'x':
        return this.setNumberAttribute(attribute, value, this.xValue, (next) => {
          this.xValue = next;
        });
      case 'y':
        return this.setNumberAttribute(attribute, value, this.yValue, (next) => {
          this.yValue = next;
        });
      case 'width':
        return this.setNumberAttribute(attribute, value, this.widthValue, (next) => {
          if (next <= 0) {
            throw new DomainError('rect width must be positive');
          }

          this.widthValue = next;
        });
      case 'height':
        return this.setNumberAttribute(attribute, value, this.heightValue, (next) => {
          if (next <= 0) {
            throw new DomainError('rect height must be positive');
          }

          this.heightValue = next;
        });
      default:
        throw new DomainError(`unknown attribute: ${attribute}`);
    }
  }
}
