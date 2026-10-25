import type { ShapeFactory } from '../domain/ShapeFactory.js';
import { DomainError } from '../shared/DomainError.js';
import { SvgIdAllocation } from './SvgIdAllocation.js';
import type { XmlElement } from './XmlElement.js';

export class SvgIdAllocator {
  public constructor(private readonly shapeFactory: ShapeFactory) {}

  public allocate(root: XmlElement): SvgIdAllocation {
    const elements: XmlElement[] = [];
    const explicitIds = new Set<string>();
    this.collectChildren(root, elements, explicitIds);

    const usedIds = new Set(explicitIds);
    const idsByElement = new Map<XmlElement, string>();
    const warnings: string[] = [];
    for (const element of elements) {
      const explicitId = element.attribute('id');
      if (explicitId !== undefined && explicitId.length > 0) {
        idsByElement.set(element, explicitId);
        continue;
      }

      const assignedId = this.nextId(element.name, usedIds);
      usedIds.add(assignedId);
      idsByElement.set(element, assignedId);
      warnings.push(`warning: assigned id ${assignedId} to unnamed <${element.name}>`);
    }

    return new SvgIdAllocation(idsByElement, warnings);
  }

  private collectChildren(
    element: XmlElement,
    elements: XmlElement[],
    explicitIds: Set<string>,
  ): void {
    for (const child of element.children) {
      child.accept({
        visitElement: (childElement) => this.collectElement(childElement, elements, explicitIds),
        visitText: () => undefined,
      });
    }
  }

  private collectElement(
    element: XmlElement,
    elements: XmlElement[],
    explicitIds: Set<string>,
  ): void {
    if (this.shapeFactory.isIgnoredSvgElement(element.name)) {
      return;
    }

    if (!this.shapeFactory.isSvgElement(element.name)) {
      throw new DomainError(`unsupported element: ${element.name}`);
    }

    const id = element.attribute('id');
    if (id !== undefined && id.length > 0) {
      if (/\s/.test(id)) {
        throw new DomainError(`invalid id: ${id}`);
      }

      if (explicitIds.has(id)) {
        throw new DomainError(`id already exists: ${id}`);
      }

      explicitIds.add(id);
    }

    elements.push(element);
    this.collectChildren(element, elements, explicitIds);
  }

  private nextId(type: string, usedIds: ReadonlySet<string>): string {
    let sequence = 1;
    while (usedIds.has(`${type}${sequence}`)) {
      sequence += 1;
    }

    return `${type}${sequence}`;
  }
}
