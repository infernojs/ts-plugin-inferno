import * as ts from "typescript";
import {handleCjsModules} from "./cjsModuleHandler";
import {getDeclaredNames, getPrologueLength, getUniqueName} from "./utils/moduleUtils";

// System.register([...dependencies], function (exports_1, context_1) { ... }), optionally with a module name first
function getRegisterCall(statement: ts.Statement) {
    if (
        ts.isExpressionStatement(statement) &&
        ts.isCallExpression(statement.expression) &&
        ts.isPropertyAccessExpression(statement.expression.expression) &&
        ts.isIdentifier(statement.expression.expression.expression) &&
        ts.idText(statement.expression.expression.expression) === 'System' &&
        ts.idText(statement.expression.expression.name) === 'register'
    ) {
        const args = statement.expression.arguments
        const dependencies = args[args.length - 2]
        const declare = args[args.length - 1]

        if (dependencies && ts.isArrayLiteralExpression(dependencies) && declare && ts.isFunctionExpression(declare)) {
            return {call: statement.expression, dependencies, declare}
        }
    }
    return null
}

// return { setters: [...], execute: function () { ... } };
function getSetters(statement: ts.Statement) {
    if (ts.isReturnStatement(statement) && statement.expression && ts.isObjectLiteralExpression(statement.expression)) {
        const setters = statement.expression.properties.find(property =>
            ts.isPropertyAssignment(property) &&
            ts.isIdentifier(property.name) &&
            ts.idText(property.name) === 'setters' &&
            ts.isArrayLiteralExpression(property.initializer)
        ) as ts.PropertyAssignment | undefined

        if (setters) {
            return {statement, object: statement.expression, setters, elements: (setters.initializer as ts.ArrayLiteralExpression)}
        }
    }
    return null
}

/*
 * System modules get inferno as a dependency of System.register(), with a setter that assigns the helpers to
 * variables of the module, like TypeScript emits for an import. A file that is not a module is not wrapped,
 * it gets the helpers like a CommonJS file.
 */
export function handleSystemModules(sourceFile: ts.SourceFile, context: ts.TransformationContext, helpers: string[]) {
    const factory = context.factory
    const index = sourceFile.statements.findIndex(statement => getRegisterCall(statement) !== null)
    const register = index === -1 ? null : getRegisterCall(sourceFile.statements[index])
    const settersIndex = register ? register.declare.body.statements.findIndex(statement => getSetters(statement) !== null) : -1

    if (settersIndex === -1) {
        return handleCjsModules(sourceFile, context, helpers)
    }

    const {call, dependencies, declare} = register
    const statements = declare.body.statements
    const declaredNames = getDeclaredNames(statements)
    const helpersToAdd = helpers.filter(name => !declaredNames.has(name))

    if (helpersToAdd.length === 0) {
        return sourceFile
    }

    const setters = getSetters(statements[settersIndex])
    const moduleName = getUniqueName('$inferno', new Set([...declaredNames, ...helpersToAdd]))
    // function ($inferno) { createVNode = $inferno.createVNode; ... }
    const setter = factory.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        [factory.createParameterDeclaration(undefined, undefined, moduleName)],
        undefined,
        factory.createBlock(helpersToAdd.map(helper => factory.createExpressionStatement(
            factory.createAssignment(
                factory.createIdentifier(helper),
                factory.createPropertyAccessExpression(factory.createIdentifier(moduleName), helper)
            )
        )), true)
    )
    const setterCount = setters.elements.elements.length
    // Dependencies are passed to the setters in order
    const updatedDependencies = factory.updateArrayLiteralExpression(dependencies, [
        ...dependencies.elements.slice(0, setterCount),
        factory.createStringLiteral('inferno'),
        ...dependencies.elements.slice(setterCount)
    ])
    const updatedReturn = factory.updateReturnStatement(setters.statement, factory.updateObjectLiteralExpression(
        setters.object,
        setters.object.properties.map(property => property === setters.setters
            ? factory.updatePropertyAssignment(
                setters.setters,
                setters.setters.name,
                factory.updateArrayLiteralExpression(setters.elements, [...setters.elements.elements, setter])
            )
            : property
        )
    ))
    const prologueLength = getPrologueLength(statements)
    const updatedStatements = [
        ...statements.slice(0, prologueLength),
        // var createVNode, createComponentVNode;
        factory.createVariableStatement(undefined, helpersToAdd.map(helper => factory.createVariableDeclaration(helper))),
        ...statements.slice(prologueLength, settersIndex),
        updatedReturn,
        ...statements.slice(settersIndex + 1)
    ]
    const updatedDeclare = factory.updateFunctionExpression(
        declare,
        declare.modifiers,
        declare.asteriskToken,
        declare.name,
        declare.typeParameters,
        declare.parameters,
        declare.type,
        factory.updateBlock(declare.body, updatedStatements)
    )
    const updatedCall = factory.updateCallExpression(call, call.expression, call.typeArguments, [
        ...call.arguments.slice(0, -2),
        updatedDependencies,
        updatedDeclare
    ])

    return factory.updateSourceFile(sourceFile, [
        ...sourceFile.statements.slice(0, index),
        factory.updateExpressionStatement(sourceFile.statements[index] as ts.ExpressionStatement, updatedCall),
        ...sourceFile.statements.slice(index + 1)
    ], false)
}
