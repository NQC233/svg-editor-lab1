import type { ShapePlacement } from '../domain/ShapePlacement.js';
import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import { ZOrderCommand } from './ZOrderCommand.js';

export class FrontCommand extends ZOrderCommand {
  protected override get direction(): 'front' {
    return 'front';
  }

  protected override get usage(): string {
    return 'usage: front <id>';
  }

  protected override move(document: SvgDocument, shape: Shape): ShapePlacement | undefined {
    return document.moveToFront(shape);
  }
}
