import { DomainError } from '../shared/DomainError.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { DocumentCommand } from './DocumentCommand.js';

export class SaveCommand extends DocumentCommand {
  public execute(context: CommandContext, args: CommandArguments): CommandResult {
    const document = context.requireDocument();
    if (args.length > 1) {
      throw new DomainError('usage: save [file.svg]');
    }

    const path = args.value(0) ?? context.currentPath;
    if (path === undefined) {
      throw new DomainError('no file path; use save <file.svg>');
    }

    let count: number;
    try {
      count = context.svgWriter.write(document, path);
    } catch {
      throw new DomainError(`cannot write file: ${path}`);
    }

    context.setCurrentPath(path);
    return new CommandResult([`saved to ${path} (${count} elements)`]);
  }
}
