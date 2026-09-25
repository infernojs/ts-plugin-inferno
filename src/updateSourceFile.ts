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

    /*
     * A file without imports and exports is a script (unless moduleDetection is "force"), which TypeScript emits
     * without a module wrapper in every format. Scripts cannot contain import declarations and an added one would turn
     * the file into a module, so the helpers are required like in a CommonJS file, as babel-plugin-inferno does.
     * CommonJS JavaScript files (allowJs) are no ES modules either.
     */
    if (!ts.isExternalModule(sourceFile)) {
        return handleCjsModules(sourceFile, context, helpers)
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
