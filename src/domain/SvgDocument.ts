import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { Container } from './Container.js';
import type { GeometrySnapshot } from './GeometrySnapshot.js';
import type { Group } from './Group.js';
import { GroupedShapePlacement } from './GroupedShapePlacement.js';
import { GroupSnapshot } from './GroupSnapshot.js';
import { LeafShape } from './LeafShape.js';
import type { Shape } from './Shape.js';
import { ShapePlacement } from './ShapePlacement.js';
import { UngroupSnapshot } from './UngroupSnapshot.js';

interface ShapeLocation {
  readonly parent: Container | undefined;
  readonly siblings: Shape[];
  readonly index: number;
}

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
    const { parent, siblings, index } = this.locateShape(shape);
    siblings.splice(index, 1);

    this.unregisterSubtree(shape);
    return new ShapePlacement(parent, index);
  }

  public ungroup(container: Container): UngroupSnapshot {
    const { parent, siblings, index } = this.locateShape(container);
    if (parent === undefined) {
      throw new DomainError(`cannot ungroup top-level container: ${container.id}`);
    }

    const children = this.mutableChildrenOf(container);
    this.assertChildrenBelongTo(container, children);
    const snapshot = new UngroupSnapshot(container, parent, index, children);

    siblings.splice(index, 1, ...children);
    for (const child of children) {
      this.parents.set(child, parent);
    }

    this.childrenByShape.set(container, []);
    this.parents.delete(container);
    this.shapesById.delete(container.id);
    return snapshot;
  }

  public restoreUngrouped(snapshot: UngroupSnapshot): void {
    const { container, parent, index } = snapshot;
    const children = snapshot.children;
    if (!this.parents.has(parent) || this.shapesById.get(parent.id) !== parent) {
      throw new DomainError(`no such shape: ${parent.id}`);
    }

    if (this.parents.has(container) || this.shapesById.has(container.id)) {
      throw new DomainError(`id already exists: ${container.id}`);
    }

    const siblings = this.mutableChildrenOf(parent);
    this.assertInsertionIndex(index, siblings.length);
    children.forEach((child, offset) => {
      if (
        siblings[index + offset] !== child ||
        this.parents.get(child) !== parent ||
        this.shapesById.get(child.id) !== child
      ) {
        throw new DomainError(`cannot restore ungrouped container: ${container.id}`);
      }
    });

    siblings.splice(index, children.length, container);
    this.shapesById.set(container.id, container);
    this.parents.set(container, parent);
    this.childrenByShape.set(container, [...children]);
    for (const child of children) {
      this.parents.set(child, container);
    }
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

  public moveToEnd(shape: Shape, container: Container): ShapePlacement | undefined {
    this.assertContainer(container);
    const original = this.locateShape(shape);
    if (this.isWithinSubtree(container, shape)) {
      throw new DomainError(`cannot move a container into its own descendant: ${shape.id}`);
    }

    if (original.parent === container && original.index === original.siblings.length - 1) {
      return undefined;
    }

    original.siblings.splice(original.index, 1);
    this.mutableChildrenOf(container).push(shape);
    this.parents.set(shape, container);
    return new ShapePlacement(original.parent, original.index);
  }

  public restorePlacement(shape: Shape, placement: ShapePlacement): void {
    this.assertContainer(placement.parent);
    const current = this.locateShape(shape);
    const destinationSiblings = this.siblingsOf(placement.parent);
    const lengthAfterRemoval =
      destinationSiblings.length - (current.parent === placement.parent ? 1 : 0);
    this.assertInsertionIndex(placement.index, lengthAfterRemoval);

    current.siblings.splice(current.index, 1);
    destinationSiblings.splice(placement.index, 0, shape);
    this.parents.set(shape, placement.parent);
  }

  public groupShapes(group: Group, targetIds: readonly string[]): GroupSnapshot {
    if (targetIds.length === 0) {
      throw new DomainError('group requires at least one target');
    }

    if (this.shapesById.has(group.id)) {
      throw new DomainError(`id already exists: ${group.id}`);
    }

    const seenTargets = new Set<string>();
    for (const id of targetIds) {
      if (seenTargets.has(id)) {
        throw new DomainError(`duplicate target: ${id}`);
      }

      seenTargets.add(id);
    }

    const targets = targetIds.map((id) => this.require(id));
    for (const target of targets) {
      if (!(target instanceof Container)) {
        continue;
      }

      if (targets.some((other) => other !== target && this.isWithinSubtree(other, target))) {
        throw new DomainError(`cannot group a container into its own descendant: ${target.id}`);
      }
    }

    const locations = new Map<Shape, ShapeLocation>();
    for (const target of targets) {
      locations.set(target, this.locateShape(target));
    }

    const anchor = locations.get(targets[0]!);
    if (anchor === undefined) {
      throw new DomainError('group requires at least one target');
    }

    const targetSet = new Set(targets);
    let insertionIndex = 0;
    for (let index = 0; index < anchor.index; index += 1) {
      const sibling = anchor.siblings[index];
      if (sibling !== undefined && !targetSet.has(sibling)) {
        insertionIndex += 1;
      }
    }

    const ranks = this.documentOrderRanks();
    const entries = [...targets]
      .sort(
        (left, right) =>
          (ranks.get(left) ?? Number.MAX_SAFE_INTEGER) -
          (ranks.get(right) ?? Number.MAX_SAFE_INTEGER),
      )
      .map((child) => {
        const location = locations.get(child);
        if (location === undefined) {
          throw new DomainError(`no such shape: ${child.id}`);
        }

        return new GroupedShapePlacement(
          child,
          new ShapePlacement(location.parent, location.index),
        );
      });
    const children = entries.map((entry) => entry.shape);

    this.removeLocatedShapes(locations);
    this.insertShape(group, insertionIndex, anchor.parent);
    this.attachChildren(group, children);
    return new GroupSnapshot(group, anchor.parent, insertionIndex, entries);
  }

  public restoreGrouped(snapshot: GroupSnapshot): void {
    const { group, parent, index } = snapshot;
    const location = this.locateShape(group);
    if (location.parent !== parent || location.index !== index) {
      throw new DomainError(`cannot restore grouped container: ${group.id}`);
    }

    const children = snapshot.children;
    const currentChildren = this.mutableChildrenOf(group);
    if (
      currentChildren.length !== children.length ||
      currentChildren.some((child, offset) => child !== children[offset])
    ) {
      throw new DomainError(`cannot restore grouped container: ${group.id}`);
    }

    const placementsByParent = this.groupOriginalPlacements(
      snapshot.entries,
      group,
      location.parent,
    );
    location.siblings.splice(location.index, 1);
    this.shapesById.delete(group.id);
    this.parents.delete(group);
    this.childrenByShape.set(group, []);
    this.restoreOriginalPlacements(placementsByParent);
  }

  public reapplyGroup(snapshot: GroupSnapshot): void {
    const { group, parent, index } = snapshot;
    if (this.shapesById.has(group.id) || this.parents.has(group)) {
      throw new DomainError(`id already exists: ${group.id}`);
    }

    this.assertContainer(parent);
    const children = snapshot.children;
    const entries = snapshot.entries;
    const locations = new Map<Shape, ShapeLocation>();
    entries.forEach((entry) => {
      const child = entry.shape;
      const placement = entry.placement;
      if (this.shapesById.get(child.id) !== child || !this.parents.has(child)) {
        throw new DomainError(`cannot redo grouped container: ${group.id}`);
      }

      const location = this.locateShape(child);
      if (location.parent !== placement.parent || location.index !== placement.index) {
        throw new DomainError(`cannot redo grouped container: ${group.id}`);
      }

      locations.set(child, location);
    });

    const siblingCount = this.siblingsOf(parent).length;
    const removedFromParent = entries.filter((entry) => entry.placement.parent === parent).length;
    this.assertInsertionIndex(index, siblingCount - removedFromParent);

    this.removeLocatedShapes(locations);
    this.insertShape(group, index, parent);
    this.attachChildren(group, children);
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

  private locateShape(shape: Shape): ShapeLocation {
    if (!this.parents.has(shape) || this.shapesById.get(shape.id) !== shape) {
      throw new DomainError(`no such shape: ${shape.id}`);
    }

    const parent = this.parents.get(shape);
    const siblings = this.siblingsOf(parent);
    const index = siblings.indexOf(shape);
    if (index < 0) {
      throw new DomainError(`no such shape: ${shape.id}`);
    }

    return { parent, siblings, index };
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

  private assertChildrenBelongTo(container: Container, children: readonly Shape[]): void {
    const childIds = new Set<string>();
    for (const child of children) {
      if (
        this.parents.get(child) !== container ||
        this.shapesById.get(child.id) !== child ||
        childIds.has(child.id)
      ) {
        throw new DomainError(`id already exists: ${child.id}`);
      }

      childIds.add(child.id);
    }
  }

  private isWithinSubtree(candidate: Shape, root: Shape): boolean {
    let current: Shape | undefined = candidate;
    while (current !== undefined) {
      if (current === root) {
        return true;
      }

      current = this.parents.get(current);
    }

    return false;
  }

  private documentOrderRanks(): ReadonlyMap<Shape, number> {
    const ranks = new Map<Shape, number>();
    let nextRank = 0;
    const visit = (shape: Shape): void => {
      ranks.set(shape, nextRank);
      nextRank += 1;
      for (const child of this.childrenByShape.get(shape) ?? []) {
        visit(child);
      }
    };

    for (const shape of this.rootShapesValue) {
      visit(shape);
    }

    return ranks;
  }

  private removeLocatedShapes(locations: ReadonlyMap<Shape, ShapeLocation>): void {
    const byParent = new Map<Container | undefined, ShapeLocation[]>();
    for (const location of locations.values()) {
      const siblings = byParent.get(location.parent) ?? [];
      siblings.push(location);
      byParent.set(location.parent, siblings);
    }

    for (const parentLocations of byParent.values()) {
      parentLocations.sort((left, right) => right.index - left.index);
      for (const location of parentLocations) {
        location.siblings.splice(location.index, 1);
      }
    }
  }

  private attachChildren(group: Group, children: readonly Shape[]): void {
    const groupChildren = this.mutableChildrenOf(group);
    groupChildren.push(...children);
    for (const child of children) {
      this.parents.set(child, group);
    }
  }

  private groupOriginalPlacements(
    entries: readonly GroupedShapePlacement[],
    groupedInto: Group,
    groupedIntoParent: Container | undefined,
  ): ReadonlyMap<Container | undefined, readonly GroupedShapePlacement[]> {
    const byParent = new Map<Container | undefined, GroupedShapePlacement[]>();
    for (const entry of entries) {
      const placementParent = entry.placement.parent;
      if (
        this.parents.get(entry.shape) !== groupedInto ||
        this.shapesById.get(entry.shape.id) !== entry.shape ||
        (placementParent !== undefined && this.isWithinSubtree(placementParent, groupedInto))
      ) {
        throw new DomainError(`cannot restore grouped container: ${groupedInto.id}`);
      }

      const parentEntries = byParent.get(placementParent) ?? [];
      parentEntries.push(entry);
      byParent.set(placementParent, parentEntries);
    }

    for (const [parent, parentEntries] of byParent) {
      if (
        parent !== undefined &&
        (!this.parents.has(parent) || this.shapesById.get(parent.id) !== parent)
      ) {
        throw new DomainError(`cannot restore grouped container: ${groupedInto.id}`);
      }

      parentEntries.sort((left, right) => left.placement.index - right.placement.index);
      let siblingCount = this.siblingsOf(parent).length;
      if (parent === groupedIntoParent) {
        siblingCount -= 1;
      }

      for (const entry of parentEntries) {
        const { index } = entry.placement;
        if (!Number.isInteger(index) || index < 0 || index > siblingCount) {
          throw new DomainError(`cannot restore grouped container: ${groupedInto.id}`);
        }

        siblingCount += 1;
      }
    }

    return byParent;
  }

  private restoreOriginalPlacements(
    placementsByParent: ReadonlyMap<Container | undefined, readonly GroupedShapePlacement[]>,
  ): void {
    for (const [parent, entries] of placementsByParent) {
      for (const entry of entries) {
        this.siblingsOf(parent).splice(entry.placement.index, 0, entry.shape);
        this.parents.set(entry.shape, parent);
      }
    }
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

  private siblingsOf(container: Container | undefined): Shape[] {
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
