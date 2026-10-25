import { DomainError } from '../shared/DomainError.js';
import type { CommandCatalog } from './CommandCatalog.js';
import type { CommandInvoker } from '../commands/CommandInvoker.js';

export class CommandDispatcher {
  public constructor(
    private readonly catalog: CommandCatalog,
    private readonly invoker: CommandInvoker,
  ) {}

  public dispatch(tokens: readonly string[]): readonly string[] {
    const name = tokens[0];
    if (name === undefined) {
      return [];
    }

    const createCommand = this.catalog.find(name);
    if (createCommand === undefined) {
      throw new DomainError(`unknown command: ${name}`);
    }

    const command = createCommand();
    return this.invoker.execute(command, tokens.slice(1));
  }
}
