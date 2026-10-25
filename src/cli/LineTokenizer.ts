import { DomainError } from '../shared/DomainError.js';
import { CommandToken } from '../commands/CommandToken.js';

export class LineTokenizer {
  public tokenize(line: string): CommandToken[] | null {
    if (line.trimStart().startsWith('#')) {
      return null;
    }

    const tokens: CommandToken[] = [];
    let token = '';
    let inQuotes = false;
    let tokenStarted = false;
    let tokenQuoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line.charAt(index);

      if (inQuotes && character === '\\') {
        const next = line.charAt(index + 1);
        if (next === '"' || next === '\\') {
          token += next;
          tokenStarted = true;
          index += 1;
          continue;
        }
      }

      if (character === '"') {
        inQuotes = !inQuotes;
        tokenStarted = true;
        tokenQuoted = true;
        continue;
      }

      if (!inQuotes && /\s/.test(character)) {
        if (tokenStarted) {
          tokens.push(new CommandToken(token, tokenQuoted));
          token = '';
          tokenStarted = false;
          tokenQuoted = false;
        }
        continue;
      }

      token += character;
      tokenStarted = true;
    }

    if (inQuotes) {
      throw new DomainError('unterminated quoted string');
    }

    if (tokenStarted) {
      tokens.push(new CommandToken(token, tokenQuoted));
    }

    return tokens;
  }
}
