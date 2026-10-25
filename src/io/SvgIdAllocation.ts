import { DomainError } from '../shared/DomainError.js';
import type { XmlElement } from './XmlElement.js';

export class SvgIdAllocation {
  public constructor(
    private readonly idsByElement: ReadonlyMap<XmlElement, string>,
    private readonly warningsValue: readonly string[],
  ) {}

  public get warnings(): readonly string[] {
    return [...this.warningsValue];
  }

  public idFor(element: XmlElement): string {
    const id = this.idsByElement.get(element);
    if (id === undefined) {
      throw new DomainError(`invalid SVG: missing id on ${element.name}`);
    }

    return id;
  }
}
