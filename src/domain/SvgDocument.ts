import { DomainError } from '../shared/DomainError.js';

export class SvgDocument {
  private widthValue: number;
  private heightValue: number;

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

  private assertPositiveDimensions(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new DomainError('canvas width and height must be positive');
    }
  }
}
