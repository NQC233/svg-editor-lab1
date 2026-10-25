import { Shape } from './Shape.js';

export abstract class Container extends Shape {
  public override isContainer(): this is Container {
    return true;
  }
}
