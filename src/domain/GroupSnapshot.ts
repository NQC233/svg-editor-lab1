import type { Container } from './Container.js';
import type { Group } from './Group.js';
import type { GroupedShapePlacement } from './GroupedShapePlacement.js';
import type { Shape } from './Shape.js';

export class GroupSnapshot {
  private readonly entriesValue: readonly GroupedShapePlacement[];

  public constructor(
    private readonly groupValue: Group,
    private readonly parentValue: Container | undefined,
    private readonly indexValue: number,
    entries: readonly GroupedShapePlacement[],
  ) {
    this.entriesValue = [...entries];
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
    return this.entriesValue.map((entry) => entry.shape);
  }

  public get entries(): readonly GroupedShapePlacement[] {
    return [...this.entriesValue];
  }
}
