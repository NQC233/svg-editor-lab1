import { SvgDocument } from '../domain/SvgDocument.js';
import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { NumberParser } from '../shared/NumberParser.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';
import { DocumentCommand } from './DocumentCommand.js';

export class InitCommand extends DocumentCommand {
  public execute(context: CommandContext, args: readonly string[]): CommandResult {
    if (args.length > 2) {
      throw new DomainError('usage: init [w] [h]');
    }

    if (args.length === 1) {
      throw new DomainError('init requires both width and height');
    }

    let width = 800;
    let height = 600;

    if (args.length === 2) {
      const widthToken = args[0];
      const heightToken = args[1];
      if (widthToken === undefined || heightToken === undefined) {
        throw new DomainError('init requires both width and height');
      }

      width = NumberParser.parse(widthToken);
      height = NumberParser.parse(heightToken);
    }

    try {
      context.setDocument(new SvgDocument(width, height));
    } catch (error) {
      if (error instanceof DomainError) {
        throw new DomainError('init width and height must be positive');
      }

      throw error;
    }

    return new CommandResult([
      `canvas ${NumberFormatter.format(width)}x${NumberFormatter.format(height)} created`,
    ]);
  }
}
