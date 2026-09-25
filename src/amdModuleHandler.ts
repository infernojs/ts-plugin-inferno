import * as ts from "typescript";
import {handleCjsModules} from "./cjsModuleHandler";
import {createHelperStatements, getDeclaredNames, getPrologueLength, getUniqueName} from "./utils/moduleUtils";

// define([...dependencies], function (require, exports, ...modules) { ... }), optionally with a module name first
function getDefineCall(statement: ts.Statement) {
    if (
        ts.isExpressionStatement(statement) &&
        ts.isCallExpression(statement.expression) &&
        ts.isIdentifier(statement.expression.expression) &&
        ts.idText(statement.expression.expression) === 'define'
    ) {
        const args = statement.expression.arguments
        const dependencies = args[args.length - 2]
        const moduleFactory = args[args.length - 1]

        if (dependencies && ts.isArrayLiteralExpression(dependencies) && moduleFactory && ts.isFunctionExpression(moduleFactory)) {
            return {call: statement.expression, dependencies, moduleFactory}
        }
    }
    return null
}

/*
 * AMD modules get inferno as a dependency of define(), with a factory parameter the helpers are read from.
 * A file that is not a module is not wrapped in define(), it gets the helpers like a CommonJS file.
 */
export function handleAmdModules(sourceFile: ts.SourceFile, context: ts.TransformationContext, helpers: string[]) {
    const factory = context.factory
    const index = sourceFile.statements.findIndex(statement => getDefineCall(statement) !== null)

    if (index === -1) {
        return handleCjsModules(sourceFile, context, helpers)
    }

    const {call, dependencies, moduleFactory} = getDefineCall(sourceFile.statements[index])
    const statements = moduleFactory.body.statements
    const declaredNames = getDeclaredNames(statements)
    const helpersToAdd = helpers.filter(name => !declaredNames.has(name))

    if (helpersToAdd.length === 0) {
        return sourceFile
    }
    for (const parameter of moduleFactory.parameters) {
        if (ts.isIdentifier(parameter.name)) {
            declaredNames.add(ts.idText(parameter.name))
        }
    }

    const moduleName = getUniqueName('$inferno', declaredNames)
    const parameterCount = moduleFactory.parameters.length
    const prologueLength = getPrologueLength(statements)
    // Dependencies are passed to the factory parameters in order, side effect imports without a parameter come last
    const updatedDependencies = factory.updateArrayLiteralExpression(dependencies, [
        ...dependencies.elements.slice(0, parameterCount),
        factory.createStringLiteral('inferno'),
        ...dependencies.elements.slice(parameterCount)
    ])
    const updatedFactory = factory.updateFunctionExpression(
        moduleFactory,
        moduleFactory.modifiers,
        moduleFactory.asteriskToken,
        moduleFactory.name,
        moduleFactory.typeParameters,
        [...moduleFactory.parameters, factory.createParameterDeclaration(undefined, undefined, moduleName)],
        moduleFactory.type,
        factory.updateBlock(moduleFactory.body, [
            ...statements.slice(0, prologueLength),
            ...createHelperStatements(factory, helpersToAdd, moduleName),
            ...statements.slice(prologueLength)
        ])
    )
    const updatedCall = factory.updateCallExpression(call, call.expression, call.typeArguments, [
        ...call.arguments.slice(0, -2),
        updatedDependencies,
        updatedFactory
    ])

    return factory.updateSourceFile(sourceFile, [
        ...sourceFile.statements.slice(0, index),
        factory.updateExpressionStatement(sourceFile.statements[index] as ts.ExpressionStatement, updatedCall),
        ...sourceFile.statements.slice(index + 1)
    ], false)
}
