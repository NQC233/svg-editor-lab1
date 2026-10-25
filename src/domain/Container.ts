import { DomainError } from '../shared/DomainError.js';
import { Shape } from './Shape.js';

/** Internal capability used only by SvgDocument to preserve tree invariants. */
export const containerMutationKey = Symbol('container-mutation');

export abstract class Container extends Shape {
  private readonly childrenValue: Shape[] = [];

  public get children(): readonly Shape[] {
    return this.childrenValue;
  }

  public override childShapes(): readonly Shape[] {
    return this.children;
  }

  public insertChild(shape: Shape, insertionIndex: number, key: symbol): void {
    Container.assertMutationKey(key);
    this.childrenValue.splice(insertionIndex, 0, shape);
  }

  public removeChild(shape: Shape, key: symbol): void {
    Container.assertMutationKey(key);
    const insertionIndex = this.childrenValue.indexOf(shape);
    if (insertionIndex < 0) {
      throw new DomainError(`container does not own shape: ${shape.id}`);
    }

    this.childrenValue.splice(insertionIndex, 1);
  }

  private static assertMutationKey(key: symbol): void {
    if (key !== containerMutationKey) {
      throw new DomainError('container structure must be changed through SvgDocument');
    }
  }
}
