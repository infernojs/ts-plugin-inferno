import {
    BindingName,
    CompilerOptions,
    idText,
    isClassDeclaration,
    isExpressionStatement,
    isFunctionDeclaration,
    isIdentifier,
    isImportDeclaration,
    isImportEqualsDeclaration,
    isNamespaceImport,
    isOmittedExpression,
    isStringLiteral,
    isVariableStatement,
    ModuleKind,
    NodeFactory,
    ScriptTarget,
    SourceFile,
    Statement
} from "typescript";

/*
 * The module format the file is emitted in. The plugin runs after TypeScript's module transform, so the helpers
 * have to be imported in the same format: ES import, CommonJS require, or a dependency of the AMD, UMD or System
 * wrapper. With module Node16 to NodeNext the format is decided per file, e.g. by the type field of package.json.
 */
export function getModuleFormat(sourceFile: SourceFile, options: CompilerOptions): ModuleKind {
    const module = options.module ?? (options.target !== undefined && options.target < ScriptTarget.ES2015 ? ModuleKind.CommonJS : ModuleKind.ES2015)

    if (module >= ModuleKind.Node16 && module <= ModuleKind.NodeNext) {
        return sourceFile.impliedNodeFormat === ModuleKind.CommonJS ? ModuleKind.CommonJS : ModuleKind.ESNext
    }
    return module
}

function addBindingNames(name: BindingName, names: Set<string>) {
    if (isIdentifier(name)) {
        names.add(idText(name))
    } else {
        for (const element of name.elements) {
            if (!isOmittedExpression(element)) {
                addBindingNames(element.name, names)
            }
        }
    }
}

// Names declared by the statements of a module scope: variables, functions, classes and imports
export function getDeclaredNames(statements: readonly Statement[]): Set<string> {
    const names = new Set<string>()

    for (const statement of statements) {
        if (isVariableStatement(statement)) {
            for (const declaration of statement.declarationList.declarations) {
                addBindingNames(declaration.name, names)
            }
        } else if ((isFunctionDeclaration(statement) || isClassDeclaration(statement)) && statement.name) {
            names.add(idText(statement.name))
        } else if (isImportEqualsDeclaration(statement)) {
            names.add(idText(statement.name))
        } else if (isImportDeclaration(statement) && statement.importClause && !statement.importClause.isTypeOnly) {
            const {name, namedBindings} = statement.importClause

            if (name) {
                names.add(idText(name))
            }
            if (namedBindings) {
                if (isNamespaceImport(namedBindings)) {
                    names.add(idText(namedBindings.name))
                } else {
                    for (const element of namedBindings.elements) {
                        if (!element.isTypeOnly) {
                            names.add(idText(element.name))
                        }
                    }
                }
            }
        }
    }
    return names
}

// Number of leading directives like "use strict" or "use client", new statements go after them
export function getPrologueLength(statements: readonly Statement[]): number {
    let length = 0

    while (length < statements.length && isExpressionStatement(statements[length]) && isStringLiteral((statements[length] as any).expression)) {
        length++
    }
    return length
}

export function getUniqueName(base: string, names: Set<string>): string {
    let name = base

    for (let i = 1; names.has(name); i++) {
        name = `${base}_${i}`
    }
    return name
}

/*
 * var createVNode = $inferno.createVNode; ... for each helper, in the order the plugin has always emitted them
 * for CommonJS.
 */
export function createHelperStatements(factory: NodeFactory, helpers: string[], moduleName: string): Statement[] {
    return helpers.map(helper => factory.createVariableStatement(undefined, [
        factory.createVariableDeclaration(
            helper,
            undefined,
            undefined,
            factory.createPropertyAccessExpression(factory.createIdentifier(moduleName), helper)
        )
    ])).reverse()
}

// var $inferno = require("inferno");
export function createRequireStatement(factory: NodeFactory, moduleName: string): Statement {
    return factory.createVariableStatement(
        undefined,
        factory.createVariableDeclarationList([
            factory.createVariableDeclaration(
                moduleName,
                undefined,
                undefined,
                factory.createCallExpression(factory.createIdentifier('require'), [], [factory.createStringLiteral('inferno')])
            )
        ])
    )
}
