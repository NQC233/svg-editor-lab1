import { Container } from './Container.js';

export class Group extends Container {
  public constructor(id: string) {
    super(id);
  }

  public override get type(): string {
    return 'g';
  }

  public override treeAttributes(): string {
    return '';
  }

  public override detailLines(): readonly string[] {
    return [];
  }
}
