import * as ts from "typescript";
import {isEcmaModuleStandardDefined} from "./utils/isEcmaModuleStandardDefined";
import {handleEcmaModules} from "./ecmaModuleHandler";
import {handleCjsModules} from "./cjsModuleHandler";

export function updateSourceFile(sourceFile: ts.SourceFile, context: ts.TransformationContext) {
  const options = context.getCompilerOptions()

  if (isEcmaModuleStandardDefined(options)) {
    return handleEcmaModules(sourceFile, context)
  }

  return handleCjsModules(sourceFile, context)
}
