import { DomainError } from '../shared/DomainError.js';
import { Container, containerMutationKey } from './Container.js';
import type { Shape } from './Shape.js';

export class SvgDocument {
  private widthValue: number;
  private heightValue: number;
  private readonly rootShapesValue: Shape[] = [];
  private readonly shapesById = new Map<string, Shape>();
  private readonly parents = new Map<Shape, Container | undefined>();

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

  public resize(width: number, height: number): void {
    this.assertPositiveDimensions(width, height);
    this.widthValue = width;
    this.heightValue = height;
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

  public appendShape(shape: Shape, container?: Container): number {
    const insertionIndex = this.siblingsOf(container).length;
    this.insertShape(shape, insertionIndex, container);
    return insertionIndex;
  }

  public insertShape(shape: Shape, insertionIndex: number, container?: Container): void {
    this.assertContainer(container);
    this.assertInsertionIndex(insertionIndex, this.siblingsOf(container).length);
    this.assertSubtreeIdsAvailable(shape);

    if (container === undefined) {
      this.rootShapesValue.splice(insertionIndex, 0, shape);
    } else {
      container.insertChild(shape, insertionIndex, containerMutationKey);
    }

    this.registerSubtree(shape, container);
  }

  public removeShape(shape: Shape): void {
    if (!this.parents.has(shape) || this.shapesById.get(shape.id) !== shape) {
      throw new DomainError(`no such shape: ${shape.id}`);
    }

    const parent = this.parents.get(shape);
    if (parent === undefined) {
      this.rootShapesValue.splice(this.rootShapesValue.indexOf(shape), 1);
    } else {
      parent.removeChild(shape, containerMutationKey);
    }

    this.unregisterSubtree(shape);
  }

  public requireContainer(id: string): Container {
    const shape = this.find(id);
    if (shape === undefined) {
      throw new DomainError(`no such container: ${id}`);
    }

    if (!(shape instanceof Container)) {
      throw new DomainError(`not a container: ${id}`);
    }

    return shape;
  }

  public parentLabelOf(shape: Shape): string {
    if (!this.parents.has(shape)) {
      throw new DomainError(`no such shape: ${shape.id}`);
    }

    return this.parents.get(shape)?.label ?? 'svg';
  }

  private assertPositiveDimensions(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new DomainError('canvas width and height must be positive');
    }
  }

  private assertContainer(container: Container | undefined): void {
    if (container !== undefined && !this.parents.has(container)) {
      throw new DomainError(`no such shape: ${container.id}`);
    }
  }

  private assertInsertionIndex(insertionIndex: number, siblingCount: number): void {
    if (!Number.isInteger(insertionIndex) || insertionIndex < 0 || insertionIndex > siblingCount) {
      throw new DomainError(`invalid insertion index: ${insertionIndex}`);
    }
  }

  private assertSubtreeIdsAvailable(shape: Shape): void {
    const ids = new Set<string>();
    this.collectIds(shape, ids);
  }

  private collectIds(shape: Shape, ids: Set<string>): void {
    if (this.shapesById.has(shape.id) || ids.has(shape.id)) {
      throw new DomainError(`id already exists: ${shape.id}`);
    }

    ids.add(shape.id);
    for (const child of shape.childShapes()) {
      this.collectIds(child, ids);
    }
  }

  private registerSubtree(shape: Shape, parent: Container | undefined): void {
    this.shapesById.set(shape.id, shape);
    this.parents.set(shape, parent);
    for (const child of shape.childShapes()) {
      this.registerSubtree(child, shape instanceof Container ? shape : undefined);
    }
  }

  private unregisterSubtree(shape: Shape): void {
    for (const child of shape.childShapes()) {
      this.unregisterSubtree(child);
    }

    this.parents.delete(shape);
    this.shapesById.delete(shape.id);
  }

  private siblingsOf(container: Container | undefined): readonly Shape[] {
    return container?.children ?? this.rootShapesValue;
  }
}
