import * as ts from "typescript";
import {isImportDeclaration, StringLiteral} from "typescript";
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
        const matchedImportIdx = statements
            .findIndex(s => isImportDeclaration(s)
                && (s.moduleSpecifier as StringLiteral).text === 'inferno'
            );

        let infernoIdentifier = factory.createIdentifier(matchedImportIdx === -1 ? "inferno" : "inferno_1")

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

            if (matchedImportIdx === -1) {
                statements.unshift(varStatement)
            } else {
                statements.splice(matchedImportIdx + 1, 0, varStatement)
            }
        }

        if (matchedImportIdx === -1) {
            // Adding import statement does not get re-compiled in typescript core
            // So directly add require statement
            statements.unshift(
                factory.createVariableStatement(
                    undefined,
                    factory.createVariableDeclarationList([
                        factory.createVariableDeclaration(
                            "inferno",
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
            );
        }

        return factory.updateSourceFile(sourceFile, statements, false);
    }

    return sourceFile
}
