import { DomainError } from '../shared/DomainError.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { DocumentCommand } from './DocumentCommand.js';

export class ReadCommand extends DocumentCommand {
  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    if (args.length !== 1) {
      throw new DomainError('usage: read <file.svg>');
    }

    const path = args.value(0);
    if (path === undefined) {
      throw new DomainError('usage: read <file.svg>');
    }

    const result = context.svgReader.read(path);
    context.setDocument(result.document);
    context.setCurrentPath(path);
    return new CommandResult([`read ${path} (${result.elementCount} elements)`]);
  }
}
