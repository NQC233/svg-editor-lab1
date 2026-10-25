import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { Container } from './Container.js';
import type { GeometrySnapshot } from './GeometrySnapshot.js';
import { LeafShape } from './LeafShape.js';
import type { Shape } from './Shape.js';
import { ShapePlacement } from './ShapePlacement.js';

export class SvgDocument {
  private widthValue: number;
  private heightValue: number;
  private readonly rootShapesValue: Shape[] = [];
  private readonly shapesById = new Map<string, Shape>();
  private readonly parents = new Map<Shape, Container | undefined>();
  private readonly childrenByShape = new Map<Shape, Shape[]>();

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
    return [...this.rootShapesValue];
  }

  public resize(width: number, height: number): void {
    this.assertPositiveDimensions(width, height);
    this.widthValue = width;
    this.heightValue = height;
  }

  public find(id: string): Shape | undefined {
    return this.shapesById.get(id);
  }

  public childrenOf(shape: Shape): readonly Shape[] {
    return [...(this.childrenByShape.get(shape) ?? [])];
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

    if (shape instanceof Container && !this.childrenByShape.has(shape)) {
      this.childrenByShape.set(shape, []);
    }

    if (container === undefined) {
      this.rootShapesValue.splice(insertionIndex, 0, shape);
    } else {
      this.mutableChildrenOf(container).splice(insertionIndex, 0, shape);
    }

    this.registerSubtree(shape, container);
  }

  public removeShape(shape: Shape): ShapePlacement {
    if (!this.parents.has(shape) || this.shapesById.get(shape.id) !== shape) {
      throw new DomainError(`no such shape: ${shape.id}`);
    }

    const parent = this.parents.get(shape);
    const siblings = parent === undefined ? this.rootShapesValue : this.mutableChildrenOf(parent);
    const insertionIndex = siblings.indexOf(shape);
    if (insertionIndex < 0) {
      throw new DomainError(`no such shape: ${shape.id}`);
    }

    siblings.splice(insertionIndex, 1);

    this.unregisterSubtree(shape);
    return new ShapePlacement(parent, insertionIndex);
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

  public move(shape: Shape, dx: number, dy: number): readonly GeometrySnapshot[] {
    if (!Number.isFinite(dx)) {
      throw new DomainError(`invalid number: ${NumberFormatter.format(dx)}`);
    }

    if (!Number.isFinite(dy)) {
      throw new DomainError(`invalid number: ${NumberFormatter.format(dy)}`);
    }

    return this.transformLeafGeometry(
      shape,
      (leaf) => leaf.moveOwnGeometry(dx, dy),
      dx === 0 && dy === 0,
    );
  }

  public scale(shape: Shape, factor: number): readonly GeometrySnapshot[] {
    if (!Number.isFinite(factor)) {
      throw new DomainError(`invalid number: ${NumberFormatter.format(factor)}`);
    }

    if (factor <= 0) {
      throw new DomainError('scale factor must be positive');
    }

    return this.transformLeafGeometry(shape, (leaf) => leaf.scaleOwnGeometry(factor), factor === 1);
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
    for (const child of this.childrenByShape.get(shape) ?? []) {
      this.collectIds(child, ids);
    }
  }

  private registerSubtree(shape: Shape, parent: Container | undefined): void {
    this.shapesById.set(shape.id, shape);
    this.parents.set(shape, parent);
    if (shape instanceof Container && !this.childrenByShape.has(shape)) {
      this.childrenByShape.set(shape, []);
    }

    for (const child of this.childrenByShape.get(shape) ?? []) {
      if (!(shape instanceof Container)) {
        throw new DomainError(`shape has children but is not a container: ${shape.id}`);
      }

      this.registerSubtree(child, shape);
    }
  }

  private unregisterSubtree(shape: Shape): void {
    for (const child of this.childrenByShape.get(shape) ?? []) {
      this.unregisterSubtree(child);
    }

    this.parents.delete(shape);
    this.shapesById.delete(shape.id);
  }

  private siblingsOf(container: Container | undefined): readonly Shape[] {
    return container === undefined ? this.rootShapesValue : this.mutableChildrenOf(container);
  }

  private collectSubtree(shape: Shape): readonly Shape[] {
    if (!this.parents.has(shape) || this.shapesById.get(shape.id) !== shape) {
      throw new DomainError(`no such shape: ${shape.id}`);
    }

    return [
      shape,
      ...(this.childrenByShape.get(shape)?.flatMap((child) => this.collectSubtree(child)) ?? []),
    ];
  }

  private transformLeafGeometry(
    shape: Shape,
    transform: (leaf: LeafShape) => void,
    requestedNoOp: boolean,
  ): readonly GeometrySnapshot[] {
    const subtree = this.collectSubtree(shape);
    const leaves = subtree.filter((member): member is LeafShape => member instanceof LeafShape);
    const snapshots = leaves.map((leaf) => leaf.snapshotGeometry());

    if (requestedNoOp || snapshots.length === 0) {
      return [];
    }

    try {
      for (const leaf of leaves) {
        transform(leaf);
      }
    } catch (error) {
      for (const snapshot of snapshots) {
        snapshot.restore();
      }

      throw error;
    }

    return snapshots.every((snapshot) => snapshot.matchesCurrent()) ? [] : snapshots;
  }

  private mutableChildrenOf(container: Container): Shape[] {
    const children = this.childrenByShape.get(container);
    if (children === undefined) {
      throw new DomainError(`no such shape: ${container.id}`);
    }

    return children;
  }
}
