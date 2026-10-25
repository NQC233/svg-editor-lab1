import type { Container } from './Container.js';
import type { Group } from './Group.js';
import type { Shape } from './Shape.js';
import type { ShapePlacement } from './ShapePlacement.js';

export class GroupSnapshot {
  private readonly childrenValue: readonly Shape[];
  private readonly placementsValue: readonly ShapePlacement[];

  public constructor(
    private readonly groupValue: Group,
    private readonly parentValue: Container | undefined,
    private readonly indexValue: number,
    children: readonly Shape[],
    placements: readonly ShapePlacement[],
  ) {
    this.childrenValue = [...children];
    this.placementsValue = [...placements];
  }

  public get group(): Group {
    return this.groupValue;
  }

  public get parent(): Container | undefined {
    return this.parentValue;
  }

  public get index(): number {
    return this.indexValue;
  }

  public get children(): readonly Shape[] {
    return [...this.childrenValue];
  }

  public get placements(): readonly ShapePlacement[] {
    return [...this.placementsValue];
  }
}
