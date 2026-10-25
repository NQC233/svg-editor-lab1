import type { Shape } from './Shape.js';
import type { ShapePlacement } from './ShapePlacement.js';

export class GroupedShapePlacement {
  public constructor(
    private readonly shapeValue: Shape,
    private readonly placementValue: ShapePlacement,
  ) {}

  public get shape(): Shape {
    return this.shapeValue;
  }

  public get placement(): ShapePlacement {
    return this.placementValue;
  }
}
