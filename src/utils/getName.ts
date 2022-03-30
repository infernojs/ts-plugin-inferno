import * as ts from "typescript";

export default function getName(name): any {
  if (name.indexOf("-") !== 0) {
    return ts.factory.createStringLiteral(name);
  }
  return ts.factory.createStringLiteral(name);
}
