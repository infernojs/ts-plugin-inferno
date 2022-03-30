import * as ts from "typescript";

const assignHelper: ts.EmitHelper = {
  name: "typescript:assign",
  scoped: false,
  priority: 1,
  text: `
        var __assign = (this && this.__assign) || Object.assign || function(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };`
};

export default function createAssignHelper(
  context: ts.TransformationContext,
  attributesSegments: ts.Expression[]
) {
  const {factory} = context;

  if (context.getCompilerOptions().target >= ts.ScriptTarget.ES2015) {
    return factory.createCallExpression(
      factory.createPropertyAccessExpression(factory.createIdentifier("Object"), "assign"),
      /*typeArguments*/ undefined,
      attributesSegments
    );
  }
  context.requestEmitHelper(assignHelper);
  return factory.createCallExpression(
    getHelperName("__assign"),
    /*typeArguments*/ undefined,
    attributesSegments
  );

  function getHelperName(name) {
    return ts.setEmitFlags(
        factory.createIdentifier(name),
        ts.EmitFlags.HelperName | ts.EmitFlags.AdviseOnEmitNode
    );
  }
}
