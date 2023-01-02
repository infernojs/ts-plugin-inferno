import * as ts from "typescript";
import {POSSIBLE_IMPORTS_TO_ADD} from "./index";
import {isImportDeclaration} from "./utils/isImportDeclaration";
import {isNamedImports} from "./utils/isNamedImports";
import {isMutable} from "./utils/isMutable";


export function handleCjsModules(sourceFile: ts.SourceFile, context: ts.TransformationContext) {
    const factory = context.factory;
    const specifiersToAdd: ts.ImportSpecifier[] = [];
    let statements = sourceFile.statements;
    const matchedRequireStatementIndex = statements
        .findIndex(s => ts.isExternalModuleReference(s)
            && (s.expression as ts.StringLiteral).text === 'inferno'
        );

    // Inferno import statement already exists, and we do not want to add imports for functions already imported, so removing those from context.
    if (matchedRequireStatementIndex !== -1) {
        ((statements[matchedRequireStatementIndex] as ts.ExternalModuleReference).expression.namedBindings as ts.NamedImports).elements.forEach(e => {
            context[e.name.text] = false;
        });
    }

    for (const name of POSSIBLE_IMPORTS_TO_ADD) {
        if (context[name]) {
            specifiersToAdd.push(context['infernoImportSpecifiers'].get(name));
        }
    }

    if (specifiersToAdd.length > 0) {
        if (matchedRequireStatementIndex === -1) {
            const importStatement = factory.createImportDeclaration(
                undefined,
                factory.createImportClause(
                    false,
                    undefined,
                    factory.createNamedImports(specifiersToAdd)
                ),
                factory.createStringLiteral('inferno')
            );

            (importStatement.parent as any) = sourceFile as any

            statements = factory.createNodeArray([
                importStatement,
                ...statements
            ])
        } else {
            const statement = statements[matchedRequireStatementIndex];

            if (!isImportDeclaration(statement)) {
                throw new Error('Unexpected non-import statement');
            }
            const importDeclaration = statement as ts.ImportDeclaration;
            const namedBindings = importDeclaration.importClause.namedBindings;

            if (!namedBindings) {
                throw new Error('Unexpected import statement without import bindings');
            }

            if (!isNamedImports(namedBindings)) {
                throw new Error('Unexpected import statement with non-named import bindings');
            }

            if (!isMutable(namedBindings)) {
                throw new Error('Unexpected immutable import statement');
            }

            const newNamedImports = namedBindings.elements.concat(specifiersToAdd);
            const updatedNamedImports = factory.updateNamedImports(namedBindings, newNamedImports);

            const updatedImportDecl = factory.updateImportDeclaration(
                importDeclaration,
                importDeclaration.modifiers,
                factory.updateImportClause(
                    importDeclaration.importClause,
                    false,
                    importDeclaration.importClause?.name,
                    updatedNamedImports
                ),
                importDeclaration.moduleSpecifier,
                importDeclaration.assertClause
            )

            statements = factory.createNodeArray([
                ...statements.slice(0, matchedRequireStatementIndex),
                updatedImportDecl,
                ...statements.slice(matchedRequireStatementIndex + 1)
            ])
        }

        return factory.updateSourceFile(sourceFile, statements);
    }

    return sourceFile
}
