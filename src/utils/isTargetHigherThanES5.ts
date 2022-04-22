import * as ts from "typescript";

export default function isTargetHigherThanES5(context: ts.TransformationContext): boolean {
    return (context.getCompilerOptions().target > ts.ScriptTarget.ES5 && context.getCompilerOptions().module !== ts.ModuleKind.UMD);
}
