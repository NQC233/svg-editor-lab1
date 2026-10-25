export class Point {
  public constructor(
    private readonly xValue: number,
    private readonly yValue: number,
  ) {}

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }
}
