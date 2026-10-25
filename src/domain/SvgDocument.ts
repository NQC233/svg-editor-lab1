import { DomainError } from '../shared/DomainError.js';
import type { Shape } from './Shape.js';

export class SvgDocument {
  private widthValue: number;
  private heightValue: number;
  private readonly rootShapesValue: Shape[] = [];
  private readonly shapesById = new Map<string, Shape>();

  public constructor(width: number, height: number) {
    this.assertPositiveDimensions(width, height);
    this.widthValue = width;
    this.heightValue = height;
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  public get rootShapes(): readonly Shape[] {
    return this.rootShapesValue;
  }

  public find(id: string): Shape | undefined {
    return this.shapesById.get(id);
  }

  public require(id: string): Shape {
    const shape = this.find(id);
    if (shape === undefined) {
      throw new DomainError(`no such shape: ${id}`);
    }

    return shape;
  }

  public appendShape(shape: Shape): number {
    if (this.shapesById.has(shape.id)) {
      throw new DomainError(`id already exists: ${shape.id}`);
    }

    this.shapesById.set(shape.id, shape);
    this.rootShapesValue.push(shape);
    return this.rootShapesValue.length - 1;
  }

  public parentLabelOf(shape: Shape): string {
    if (!this.rootShapesValue.includes(shape)) {
      throw new DomainError(`no such shape: ${shape.id}`);
    }

    return 'svg';
  }

  private assertPositiveDimensions(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new DomainError('canvas width and height must be positive');
    }
  }
}
