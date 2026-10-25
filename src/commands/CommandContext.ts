import type { SvgDocument } from '../domain/SvgDocument.js';
import { DomainError } from '../shared/DomainError.js';

export class CommandContext {
  private document: SvgDocument | undefined;

  public setDocument(document: SvgDocument): void {
    this.document = document;
  }

  public requireDocument(): SvgDocument {
    if (this.document === undefined) {
      throw new DomainError("no document. use 'init' or 'read' first");
    }

    return this.document;
  }
}
