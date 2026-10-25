import { DomainError } from '../shared/DomainError.js';
import { Shape } from './Shape.js';

export abstract class Container extends Shape {
  private readonly childrenValue: Shape[] = [];

  public get children(): readonly Shape[] {
    return this.childrenValue;
  }

  public override childShapes(): readonly Shape[] {
    return this.children;
  }

  public insertChild(shape: Shape, insertionIndex: number): void {
    this.assertInsertionIndex(insertionIndex);
    this.childrenValue.splice(insertionIndex, 0, shape);
  }

  public removeChild(shape: Shape): void {
    const insertionIndex = this.childrenValue.indexOf(shape);
    if (insertionIndex < 0) {
      throw new DomainError(`container does not own shape: ${shape.id}`);
    }

    this.childrenValue.splice(insertionIndex, 1);
  }

  private assertInsertionIndex(insertionIndex: number): void {
    if (
      !Number.isInteger(insertionIndex) ||
      insertionIndex < 0 ||
      insertionIndex > this.childrenValue.length
    ) {
      throw new DomainError(`invalid insertion index: ${insertionIndex}`);
    }
  }
}
