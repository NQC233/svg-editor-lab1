import { DomainError } from '../shared/DomainError.js';
import { XmlDocument } from './XmlDocument.js';
import { XmlElement } from './XmlElement.js';
import type { XmlAttribute } from './XmlElement.js';
import { XmlText } from './XmlText.js';

const NAME_START_PATTERN = /[A-Za-z_:]/;
const NAME_PATTERN = /[A-Za-z0-9_.:-]/;

export class XmlParser {
  private static readonly DECLARATION_PATTERN =
    /^\s+version\s*=\s*(?:"1\.[0-9]+"|'1\.[0-9]+')(?:\s+encoding\s*=\s*(?:"[A-Za-z][A-Za-z0-9._-]*"|'[A-Za-z][A-Za-z0-9._-]*'))?(?:\s+standalone\s*=\s*(?:"(?:yes|no)"|'(?:yes|no)'))?\s*$/;

  private index = 0;
  private source = '';

  public parse(source: string): XmlDocument {
    this.source = source.startsWith('\uFEFF') ? source.slice(1) : source;
    this.assertValidCharacters();
    this.index = 0;
    this.skipWhitespace();
    this.skipXmlDeclaration();
    this.skipMisc();

    if (!this.startsWith('<') || this.startsWith('</')) {
      throw this.invalid('malformed element');
    }

    const root = this.parseElement();
    this.skipMisc();
    if (this.index !== this.source.length) {
      throw this.invalid('unexpected content after root element');
    }

    return new XmlDocument(root);
  }

  private parseElement(): XmlElement {
    this.expect('<');
    if (this.startsWith('!') || this.startsWith('?') || this.startsWith('/')) {
      throw this.invalid('malformed element');
    }

    const name = this.readName();
    const attributes: XmlAttribute[] = [];
    const names = new Set<string>();
    let selfClosing = false;

    while (true) {
      const whitespaceStart = this.index;
      this.skipWhitespace();
      const hadWhitespace = this.index > whitespaceStart;

      if (this.startsWith('/>')) {
        this.index += 2;
        selfClosing = true;
        break;
      }

      if (this.startsWith('>')) {
        this.index += 1;
        break;
      }

      if (!hadWhitespace) {
        throw this.invalid(`expected whitespace before attribute on ${name}`);
      }

      const attributeName = this.readName();
      if (names.has(attributeName)) {
        throw this.invalid(`duplicate attribute: ${attributeName}`);
      }

      names.add(attributeName);
      this.skipWhitespace();
      this.expect('=');
      this.skipWhitespace();
      attributes.push([attributeName, this.readAttributeValue()]);
    }

    const element = new XmlElement(name, attributes);
    if (selfClosing) {
      return element;
    }

    while (true) {
      if (this.index >= this.source.length) {
        throw this.invalid(`unclosed element: ${name}`);
      }

      if (this.startsWith('</')) {
        this.skipClosingTag(name);
        return element;
      }

      if (this.startsWith('<!--')) {
        this.skipComment();
        continue;
      }

      if (this.startsWith('<![CDATA[')) {
        element.appendChild(new XmlText(this.readCData(), true));
        continue;
      }

      if (this.startsWith('<!DOCTYPE')) {
        throw this.invalid('DOCTYPE is not supported');
      }

      if (this.startsWith('<?')) {
        throw this.invalid('processing instruction is not supported');
      }

      if (this.startsWith('<!')) {
        throw this.invalid('malformed element');
      }

      if (this.startsWith('<')) {
        element.appendChild(this.parseElement());
        continue;
      }

      element.appendChild(new XmlText(this.readText()));
    }
  }

  private readAttributeValue(): string {
    const quote = this.source.charAt(this.index);
    if (quote !== '"' && quote !== "'") {
      throw this.invalid('attribute value must be quoted');
    }

    const start = this.index + 1;
    const end = this.source.indexOf(quote, start);
    if (end === -1) {
      throw this.invalid('unterminated attribute value');
    }

    const raw = this.source.slice(start, end);
    if (raw.includes('<')) {
      throw this.invalid('invalid attribute value');
    }

    this.index = end + 1;
    return this.decodeEntities(raw);
  }

  private readText(): string {
    const start = this.index;
    while (this.index < this.source.length && this.source.charAt(this.index) !== '<') {
      this.index += 1;
    }

    return this.decodeEntities(this.source.slice(start, this.index));
  }

  private readCData(): string {
    const start = this.index + '<![CDATA['.length;
    const end = this.source.indexOf(']]>', start);
    if (end === -1) {
      throw this.invalid('unterminated CDATA');
    }

    this.index = end + ']]>'.length;
    return this.source.slice(start, end);
  }

  private decodeEntities(value: string): string {
    let decoded = '';
    let cursor = 0;

    while (cursor < value.length) {
      const ampersand = value.indexOf('&', cursor);
      if (ampersand === -1) {
        decoded += value.slice(cursor);
        break;
      }

      decoded += value.slice(cursor, ampersand);
      const semicolon = value.indexOf(';', ampersand + 1);
      if (semicolon === -1) {
        throw this.invalid('unterminated entity');
      }

      const entity = value.slice(ampersand + 1, semicolon);
      decoded += this.decodeEntity(entity);
      cursor = semicolon + 1;
    }

    return decoded;
  }

  private decodeEntity(entity: string): string {
    const predefined: Readonly<Record<string, string>> = {
      amp: '&',
      apos: "'",
      gt: '>',
      lt: '<',
      quot: '"',
    };
    const named = predefined[entity];
    if (named !== undefined) {
      return named;
    }

    const decimal = /^#([0-9]+)$/.exec(entity);
    const hexadecimal = /^#x([0-9A-Fa-f]+)$/.exec(entity);
    const digits = decimal?.[1] ?? hexadecimal?.[1];
    if (digits === undefined) {
      throw this.invalid(`unknown entity: &${entity};`);
    }

    const codePoint = Number.parseInt(digits, hexadecimal === null ? 10 : 16);
    if (
      !Number.isInteger(codePoint) ||
      !(
        codePoint === 0x9 ||
        codePoint === 0xa ||
        codePoint === 0xd ||
        (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
        (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
        (codePoint >= 0x10000 && codePoint <= 0x10ffff)
      )
    ) {
      throw this.invalid(`invalid character reference: &${entity};`);
    }

    return String.fromCodePoint(codePoint);
  }

  private skipXmlDeclaration(): void {
    if (!this.startsWith('<?xml')) {
      return;
    }

    const next = this.source.charAt(this.index + '<?xml'.length);
    if (next !== '?' && !/\s/.test(next)) {
      return;
    }

    const end = this.source.indexOf('?>', this.index + '<?xml'.length);
    if (end === -1) {
      throw this.invalid('unterminated XML declaration');
    }

    const declaration = this.source.slice(this.index + '<?xml'.length, end);
    if (!XmlParser.DECLARATION_PATTERN.test(declaration)) {
      throw this.invalid('malformed XML declaration');
    }

    this.index = end + 2;
    this.skipWhitespace();
  }

  private skipMisc(): void {
    while (true) {
      this.skipWhitespace();
      if (this.startsWith('<!--')) {
        this.skipComment();
        continue;
      }

      if (this.startsWith('<!DOCTYPE')) {
        throw this.invalid('DOCTYPE is not supported');
      }

      if (this.startsWith('<?')) {
        throw this.invalid('processing instruction is not supported');
      }

      return;
    }
  }

  private skipComment(): void {
    const start = this.index + '<!--'.length;
    const end = this.source.indexOf('-->', this.index + '<!--'.length);
    if (end === -1) {
      throw this.invalid('unterminated comment');
    }

    const content = this.source.slice(start, end);
    if (content.includes('--') || content.endsWith('-')) {
      throw this.invalid('malformed comment');
    }

    this.index = end + '-->'.length;
  }

  private skipClosingTag(expectedName: string): void {
    this.index += '</'.length;
    const name = this.readName();
    this.skipWhitespace();
    this.expect('>');
    if (name !== expectedName) {
      throw this.invalid(`mismatched closing tag: ${name}`);
    }
  }

  private readName(): string {
    const start = this.index;
    if (!NAME_START_PATTERN.test(this.source.charAt(this.index))) {
      throw this.invalid('malformed element');
    }

    this.index += 1;
    while (this.index < this.source.length && NAME_PATTERN.test(this.source.charAt(this.index))) {
      this.index += 1;
    }

    return this.source.slice(start, this.index);
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source.charAt(this.index))) {
      this.index += 1;
    }
  }

  private assertValidCharacters(): void {
    for (let index = 0; index < this.source.length; index += 1) {
      const codePoint = this.source.codePointAt(index);
      if (codePoint === undefined) {
        break;
      }

      if (
        codePoint === 0x9 ||
        codePoint === 0xa ||
        codePoint === 0xd ||
        (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
        (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
        (codePoint >= 0x10000 && codePoint <= 0x10ffff)
      ) {
        if (codePoint > 0xffff) {
          index += 1;
        }

        continue;
      }

      throw this.invalid(`invalid character U+${codePoint.toString(16).toUpperCase()}`);
    }
  }

  private expect(character: string): void {
    if (!this.startsWith(character)) {
      throw this.invalid(`expected '${character}'`);
    }

    this.index += character.length;
  }

  private startsWith(value: string): boolean {
    return this.source.startsWith(value, this.index);
  }

  private invalid(detail: string): DomainError {
    return new DomainError(`invalid SVG: ${detail}`);
  }
}
