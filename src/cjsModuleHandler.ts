import * as ts from "typescript";
import {
    createHelperStatements,
    createRequireStatement,
    getDeclaredNames,
    getPrologueLength,
    getUniqueName
} from "./utils/moduleUtils";

/*
 * Inserts var $inferno = require("inferno"); var createVNode = $inferno.createVNode; ... after the directives of
 * `statements`. Helpers the statements already declare are used as they are, and $inferno gets another name when it
 * is taken.
 */
export function insertRequireStatements(factory: ts.NodeFactory, statements: readonly ts.Statement[], helpers: string[], reservedNames: string[] = []) {
    const declaredNames = getDeclaredNames(statements)
    const helpersToAdd = helpers.filter(name => !declaredNames.has(name))

    if (helpersToAdd.length === 0) {
        return statements
    }
    for (const name of reservedNames) {
        declaredNames.add(name)
    }

    const moduleName = getUniqueName('$inferno', declaredNames)
    const prologueLength = getPrologueLength(statements)

    return [
        ...statements.slice(0, prologueLength),
        createRequireStatement(factory, moduleName),
        ...createHelperStatements(factory, helpersToAdd, moduleName),
        ...statements.slice(prologueLength)
    ]
}

export function handleCjsModules(sourceFile: ts.SourceFile, context: ts.TransformationContext, helpers: string[]) {
    const statements = insertRequireStatements(context.factory, sourceFile.statements, helpers)

    return statements === sourceFile.statements ? sourceFile : context.factory.updateSourceFile(sourceFile, statements, false)
}
