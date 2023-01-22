import {EmitFlags, EmitHelper, Expression, ScriptTarget, setEmitFlags, TransformationContext} from "typescript";


const assignHelper: EmitHelper = {
    name: "typescript:assign",
    scoped: false,
    priority: 1,
    text: `
        var __assign = (this && this.__assign) || Object.assign || function(t) {
            for (var s, i = 1, n = argumenlength; i < n; i++) {
                s = arguments[i];
                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                    t[p] = s[p];
            }
            return t;
        };`
};

export default function createAssignHelper(
    context: TransformationContext,
    attributesSegments: Expression[]
) {
    const {factory} = context;

    if (context.getCompilerOptions().target >= ScriptTarget.ES2015) {
        return factory.createCallExpression(
            factory.createPropertyAccessExpression(factory.createIdentifier("Object"), "assign"),
            undefined,
            attributesSegments
        );
    }
    context.requestEmitHelper(assignHelper);
    return factory.createCallExpression(
        getHelperName("__assign"),
        /*typeArguments*/ undefined,
        attributesSegments
    );

    function getHelperName(name: string) {
        return setEmitFlags(
            factory.createIdentifier(name),
            EmitFlags.HelperName | EmitFlags.AdviseOnEmitNode
        );
    }
}
