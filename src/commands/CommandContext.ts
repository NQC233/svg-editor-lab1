import type { SvgDocument } from '../domain/SvgDocument.js';
import type { ShapeFactory } from '../domain/ShapeFactory.js';
import type { ShowFormatter } from '../display/ShowFormatter.js';
import type { TreeFormatter } from '../display/TreeFormatter.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandHistory } from './CommandHistory.js';

interface CommandContextDependencies {
  readonly history: CommandHistory;
  readonly shapeFactory: ShapeFactory;
  readonly showFormatter: ShowFormatter;
  readonly treeFormatter: TreeFormatter;
}

export class CommandContext {
  private document: SvgDocument | undefined;

  public constructor(private readonly dependencies: CommandContextDependencies) {}

  public get history(): CommandHistory {
    return this.dependencies.history;
  }

  public get shapeFactory(): ShapeFactory {
    return this.dependencies.shapeFactory;
  }

  public get showFormatter(): ShowFormatter {
    return this.dependencies.showFormatter;
  }

  public get treeFormatter(): TreeFormatter {
    return this.dependencies.treeFormatter;
  }

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
