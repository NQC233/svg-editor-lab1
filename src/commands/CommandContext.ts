import type { SvgDocument } from '../domain/SvgDocument.js';
import type { ShapeFactory } from '../domain/ShapeFactory.js';
import type { ShowFormatter } from '../display/ShowFormatter.js';
import type { TreeFormatter } from '../display/TreeFormatter.js';
import type { SvgWriter } from '../io/SvgWriter.js';
import { DomainError } from '../shared/DomainError.js';
import type { CommandHistory } from './CommandHistory.js';

interface CommandContextDependencies {
  readonly history: CommandHistory;
  readonly shapeFactory: ShapeFactory;
  readonly showFormatter: ShowFormatter;
  readonly svgWriter: SvgWriter;
  readonly treeFormatter: TreeFormatter;
}

export class CommandContext {
  private currentPathValue: string | undefined;
  private document: SvgDocument | undefined;

  public constructor(private readonly dependencies: CommandContextDependencies) {}

  public get history(): CommandHistory {
    return this.dependencies.history;
  }

  public get currentPath(): string | undefined {
    return this.currentPathValue;
  }

  public get shapeFactory(): ShapeFactory {
    return this.dependencies.shapeFactory;
  }

  public get showFormatter(): ShowFormatter {
    return this.dependencies.showFormatter;
  }

  public get svgWriter(): SvgWriter {
    return this.dependencies.svgWriter;
  }

  public get treeFormatter(): TreeFormatter {
    return this.dependencies.treeFormatter;
  }

  public setDocument(document: SvgDocument): void {
    this.document = document;
    this.currentPathValue = undefined;
  }

  public setCurrentPath(path: string): void {
    this.currentPathValue = path;
  }

  public requireDocument(): SvgDocument {
    if (this.document === undefined) {
      throw new DomainError("no document. use 'init' or 'read' first");
    }

    return this.document;
  }
}
