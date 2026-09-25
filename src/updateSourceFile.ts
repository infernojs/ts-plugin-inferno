import * as ts from "typescript";
import {handleEcmaModules} from "./ecmaModuleHandler";
import {handleCjsModules} from "./cjsModuleHandler";
import {handleAmdModules} from "./amdModuleHandler";
import {handleUmdModules} from "./umdModuleHandler";
import {handleSystemModules} from "./systemModuleHandler";
import {getModuleFormat} from "./utils/moduleUtils";

// Imports the helpers used by the file, in the module format the file is emitted in
export function updateSourceFile(sourceFile: ts.SourceFile, context: ts.TransformationContext, helpers: string[]) {
    if (helpers.length === 0) {
        return sourceFile
    }

    switch (getModuleFormat(sourceFile, context.getCompilerOptions())) {
        case ts.ModuleKind.CommonJS:
            return handleCjsModules(sourceFile, context, helpers)
        case ts.ModuleKind.AMD:
            return handleAmdModules(sourceFile, context, helpers)
        case ts.ModuleKind.UMD:
            return handleUmdModules(sourceFile, context, helpers)
        case ts.ModuleKind.System:
            return handleSystemModules(sourceFile, context, helpers)
        default:
            return handleEcmaModules(sourceFile, context, helpers)
    }
}
