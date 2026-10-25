import { SvgDocument } from '../domain/SvgDocument.js';
import { DomainError } from '../shared/DomainError.js';
import { NumberFormatter } from '../shared/NumberFormatter.js';
import { NumberParser } from '../shared/NumberParser.js';
import { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';

export class InitCommand extends Command {
  public execute(context: CommandContext, args: readonly string[]): readonly string[] {
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

      if (width <= 0 || height <= 0) {
        throw new DomainError('init width and height must be positive');
      }
    }

    context.setDocument(new SvgDocument(width, height));

    return [`canvas ${NumberFormatter.format(width)}x${NumberFormatter.format(height)} created`];
  }
}
