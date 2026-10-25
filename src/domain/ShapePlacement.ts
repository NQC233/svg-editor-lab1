import type { Container } from './Container.js';

export class ShapePlacement {
  public constructor(
    private readonly parentValue: Container | undefined,
    private readonly indexValue: number,
  ) {}

  public get parent(): Container | undefined {
    return this.parentValue;
  }

  public get index(): number {
    return this.indexValue;
  }
}
