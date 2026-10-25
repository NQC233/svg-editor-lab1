import { DomainError } from '../shared/DomainError.js';
import type { CommandCatalog } from './CommandCatalog.js';
import type { CommandInvoker } from '../commands/CommandInvoker.js';
import { CommandArguments } from '../commands/CommandArguments.js';
import { CommandToken } from '../commands/CommandToken.js';

export class CommandDispatcher {
  public constructor(
    private readonly catalog: CommandCatalog,
    private readonly invoker: CommandInvoker,
  ) {}

  public dispatch(tokens: readonly string[]): readonly string[] {
    return this.dispatchTokens(tokens.map((value) => new CommandToken(value)));
  }

  public dispatchTokens(tokens: readonly CommandToken[]): readonly string[] {
    const args = new CommandArguments(tokens);
    const name = args.value(0);
    if (name === undefined) {
      return [];
    }

    const createCommand = this.catalog.find(name);
    if (createCommand === undefined) {
      throw new DomainError(`unknown command: ${name}`);
    }

    const command = createCommand();
    return this.invoker.execute(command, args.slice(1));
  }
}
