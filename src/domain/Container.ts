import { NumberFormatter } from '../shared/NumberFormatter.js';
import type { GeometrySnapshot } from './GeometrySnapshot.js';
import { Shape } from './Shape.js';

export abstract class Container extends Shape {
  public override moveOwnGeometry(_dx: number, _dy: number): void {}

  public override snapshotGeometry(): GeometrySnapshot | undefined {
    return undefined;
  }

  public override movedMessage(dx: number, dy: number): string {
    return `${this.label} moved by (${NumberFormatter.format(dx)},${NumberFormatter.format(dy)})`;
  }

  public override moveBackMessage(dx: number, dy: number): string {
    return `${this.label} moved back by (${NumberFormatter.format(-dx)},${NumberFormatter.format(-dy)})`;
  }
}
