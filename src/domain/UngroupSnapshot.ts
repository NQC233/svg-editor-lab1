import type { Container } from './Container.js';
import type { Shape } from './Shape.js';

export class UngroupSnapshot {
  public constructor(
    private readonly containerValue: Container,
    private readonly parentValue: Container,
    private readonly indexValue: number,
    private readonly childrenValue: readonly Shape[],
  ) {}

  public get container(): Container {
    return this.containerValue;
  }

  public get parent(): Container {
    return this.parentValue;
  }

  public get index(): number {
    return this.indexValue;
  }

  public get children(): readonly Shape[] {
    return [...this.childrenValue];
  }
}
