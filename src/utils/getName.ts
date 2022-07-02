import * as ts from "typescript";

export default function getName(name: string) {
  if (name.indexOf("-") !== 0) {
    return ts.factory.createStringLiteral(name);
  }
  return ts.factory.createIdentifier(name);
}
