import type { ShapePlacement } from '../domain/ShapePlacement.js';
import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { ZOrderCommand } from './ZOrderCommand.js';

export class BackCommand extends ZOrderCommand {
  protected override get direction(): 'back' {
    return 'back';
  }

  protected override get usage(): string {
    return 'usage: back <id>';
  }

  protected override move(document: SvgDocument, shape: Shape): ShapePlacement | undefined {
    return document.moveToBack(shape);
  }
}
