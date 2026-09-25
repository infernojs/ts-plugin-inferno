import * as ts from "typescript";
import {handleCjsModules, insertRequireStatements} from "./cjsModuleHandler";

// (function (factory) { ... define([...dependencies], factory); ... })(function (require, exports) { ... })
function getUmdCall(statement: ts.Statement) {
    if (ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression)) {
        const call = statement.expression
        const wrapper = ts.isParenthesizedExpression(call.expression) ? call.expression.expression : call.expression
        const moduleFactory = call.arguments[0]

        if (ts.isFunctionExpression(wrapper) && moduleFactory && ts.isFunctionExpression(moduleFactory)) {
            return {call, wrapper, moduleFactory}
        }
    }
    return null
}

/*
 * UMD modules get inferno as a dependency of the define() call used by AMD loaders, and require("inferno") in the
 * module factory, like TypeScript emits for an import. A file that is not a module is not wrapped, it gets the
 * helpers like a CommonJS file.
 */
export function handleUmdModules(sourceFile: ts.SourceFile, context: ts.TransformationContext, helpers: string[]) {
    const factory = context.factory
    const index = sourceFile.statements.findIndex(statement => getUmdCall(statement) !== null)

    if (index === -1) {
        return handleCjsModules(sourceFile, context, helpers)
    }

    const {call, wrapper, moduleFactory} = getUmdCall(sourceFile.statements[index])
    const reservedNames = moduleFactory.parameters.flatMap(parameter => ts.isIdentifier(parameter.name) ? [ts.idText(parameter.name)] : [])
    const statements = insertRequireStatements(factory, moduleFactory.body.statements, helpers, reservedNames)

    if (statements === moduleFactory.body.statements) {
        return sourceFile
    }

    const addDependency = (node: ts.Node): ts.Node => {
        if (
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            ts.idText(node.expression) === 'define' &&
            node.arguments.length > 0 &&
            ts.isArrayLiteralExpression(node.arguments[0])
        ) {
            const dependencies = node.arguments[0]

            return factory.updateCallExpression(node, node.expression, node.typeArguments, [
                factory.updateArrayLiteralExpression(dependencies, [...dependencies.elements, factory.createStringLiteral('inferno')]),
                ...node.arguments.slice(1)
            ])
        }
        return ts.visitEachChild(node, addDependency, context)
    }
    const updatedWrapper = ts.visitEachChild(wrapper, addDependency, context)
    const updatedFactory = factory.updateFunctionExpression(
        moduleFactory,
        moduleFactory.modifiers,
        moduleFactory.asteriskToken,
        moduleFactory.name,
        moduleFactory.typeParameters,
        moduleFactory.parameters,
        moduleFactory.type,
        factory.updateBlock(moduleFactory.body, statements)
    )
    const updatedCall = factory.updateCallExpression(
        call,
        ts.isParenthesizedExpression(call.expression) ? factory.updateParenthesizedExpression(call.expression, updatedWrapper) : updatedWrapper,
        call.typeArguments,
        [updatedFactory, ...call.arguments.slice(1)]
    )

    return factory.updateSourceFile(sourceFile, [
        ...sourceFile.statements.slice(0, index),
        factory.updateExpressionStatement(sourceFile.statements[index] as ts.ExpressionStatement, updatedCall),
        ...sourceFile.statements.slice(index + 1)
    ], false)
}
