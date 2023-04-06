import * as ts from "typescript";
import {isExpressionStatement} from "typescript";
import {POSSIBLE_IMPORTS_TO_ADD} from "./index";


export function handleCjsModules(sourceFile: ts.SourceFile, context: ts.TransformationContext) {
    const factory = context.factory;
    let statements = sourceFile.statements as any;
    const specifiersToAdd: string[] = [];

    for (const name of POSSIBLE_IMPORTS_TO_ADD) {
        if (context[name]) {
            specifiersToAdd.push(context['infernoImportSpecifiers'].get(name).name.text);
        }
    }

    if (specifiersToAdd.length > 0) {
        const matchedUseStrictStatement = statements.findIndex(
            s => isExpressionStatement(s) && (s as any).expression?.text === 'use strict'
        );

        let infernoIdentifier = factory.createIdentifier("$inferno")

        for (const specifier of specifiersToAdd) {
            let varStatement = factory.createVariableStatement(undefined, [
                factory.createVariableDeclaration(
                    specifier,
                    undefined,
                    undefined,
                    factory.createPropertyAccessExpression(
                        infernoIdentifier,
                        specifier
                    )
                )
            ]);

            if (matchedUseStrictStatement === -1) {
                statements.unshift(varStatement)
            } else {
                statements.splice(matchedUseStrictStatement + 1, 0, varStatement)
            }
        }

        const reqStatement = factory.createVariableStatement(
            undefined,
            factory.createVariableDeclarationList([
                factory.createVariableDeclaration(
                    "$inferno",
                    undefined,
                    undefined,
                    factory.createCallExpression(
                        factory.createIdentifier("require"),
                        [],
                        [factory.createStringLiteral("inferno")]
                    )
                )
            ]),
        )

        if (matchedUseStrictStatement === -1) {
            statements.unshift(reqStatement)
        } else {
            statements.splice(matchedUseStrictStatement + 1, 0, reqStatement)
        }

        return factory.updateSourceFile(sourceFile, statements, false);
    }

    return sourceFile
}
