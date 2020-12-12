import {AstNode, AstObject} from './Node';
import {Op} from './Op';

export class StackGroup extends AstNode {

  public static kind: string = 'StackGroup';

  public open: string;
  public close: string;

  constructor(open: string, close: string, children: AstObject[] = []) {
    super('', children);
    this.open = open;
    this.close = close;
  }

  public toString() {
    return this.open + this.childNodes.join(', ') + this.close;
  }

}

export class Group extends StackGroup {

  public static kind: string = 'Group';

  public append(child: AstObject) {
    if (!(child instanceof Op) || !(child as Op).isComma) return super.append(child);
    this.childNodes.push(...child.childNodes);
    return child;
  }

}
