import { createInterface } from 'node:readline';

import { DomainError } from '../shared/DomainError.js';
import type { CommandDispatcher } from './CommandDispatcher.js';
import { ConsoleOutput } from './ConsoleOutput.js';
import { LineTokenizer } from './LineTokenizer.js';

interface CliApplicationOptions {
  readonly dispatcher: CommandDispatcher;
  readonly input?: NodeJS.ReadableStream & { readonly isTTY?: boolean };
  readonly interactive?: boolean;
  readonly output?: NodeJS.WritableStream;
}

export class CliApplication {
  private static readonly BANNER = "svg-editor 0.1 — type 'help' for commands";

  private readonly input: NodeJS.ReadableStream & { readonly isTTY?: boolean };
  private readonly interactive: boolean;
  private readonly output: NodeJS.WritableStream;
  private readonly tokenizer = new LineTokenizer();
  private readonly dispatcher: CommandDispatcher;

  public constructor(options: CliApplicationOptions) {
    this.dispatcher = options.dispatcher;
    this.input = options.input ?? process.stdin;
    this.output = options.output ?? process.stdout;
    this.interactive = options.interactive ?? this.input.isTTY === true;
  }

  public async run(): Promise<void> {
    const output = new ConsoleOutput(this.output);
    const readline = createInterface({
      input: this.input,
      output: this.output,
      terminal: this.interactive,
    });
    readline.setPrompt('svg> ');

    if (this.interactive) {
      output.writeLine(CliApplication.BANNER);
      readline.prompt();
    }

    for await (const line of readline) {
      try {
        const tokens = this.tokenizer.tokenize(line);
        if (tokens !== null && tokens.length > 0) {
          for (const result of this.dispatcher.dispatch(tokens)) {
            output.writeLine(result);
          }
        }
      } catch (error) {
        if (!(error instanceof DomainError)) {
          throw error;
        }

        output.writeLine(`error: ${error.message}`);
      }

      if (this.interactive) {
        readline.prompt();
      }
    }
  }
}
