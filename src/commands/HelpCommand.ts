import { DomainError } from '../shared/DomainError.js';
import { Command } from './Command.js';
import type { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CommandResult } from './CommandResult.js';

export class HelpCommand extends Command {
  private static readonly HELP_LINES = [
    'Document:',
    '  init [w] [h]',
    '  read <file.svg>',
    '  save [file.svg]',
    '  canvas [w] [h]',
    'Edit:',
    '  create <type> <id> [params...] [in <containerId>]',
    '  delete <id>',
    '  move <id> <dx> <dy>',
    '  scale <id> <factor>',
    '  set <id> <attr> <value>',
    '  group <newGid> <id1> <id2>...',
    '  ungroup <gid>',
    '  addto <gid> <id>',
    '  front <id>',
    '  back <id>',
    'Display:',
    '  tree [id]',
    '  show <id>',
    '  help',
    'History:',
    '  undo',
    '  redo',
    'Partial implementation: available commands are help, init, canvas, create rect, circle, ellipse, line, text, g, delete, move, scale, tree, show, undo, and redo.',
  ] as const;

  public execute(_context: CommandContext, args: CommandArguments): CommandResult {
    if (args.length > 0) {
      throw new DomainError('usage: help');
    }

    return new CommandResult(HelpCommand.HELP_LINES, false);
  }
}
