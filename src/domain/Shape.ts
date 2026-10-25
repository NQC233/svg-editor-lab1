import { DomainError } from '../shared/DomainError.js';

export abstract class Shape {
  private readonly shapeId: string;

  protected constructor(id: string) {
    if (id.length === 0 || /\s/.test(id)) {
      throw new DomainError(`invalid id: ${id}`);
    }

    this.shapeId = id;
  }

  public get id(): string {
    return this.shapeId;
  }

  public get label(): string {
    return `${this.type}#${this.id}`;
  }

  public abstract get type(): string;

  public abstract treeAttributes(): string;

  public abstract detailLines(): readonly string[];
}
