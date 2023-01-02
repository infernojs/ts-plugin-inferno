import {POSSIBLE_IMPORTS_TO_ADD} from "./index";
import {
    ImportDeclaration,
    ImportSpecifier,
    isImportDeclaration,
    NamedImports,
    SourceFile,
    StringLiteral,
    TransformationContext
} from "typescript";


export function handleEcmaModules(sourceFile: SourceFile, context: TransformationContext) {
    const factory = context.factory;
    const specifiersToAdd: ImportSpecifier[] = [];
    let statements = sourceFile.statements;
    const matchedImportIdx = statements
        .findIndex(s => isImportDeclaration(s)
            && (s.moduleSpecifier as StringLiteral).text === 'inferno'
        );

    // Inferno import statement already exists, and we do not want to add imports for functions already imported, so removing those from context.
    if (matchedImportIdx !== -1) {
        ((statements[matchedImportIdx] as ImportDeclaration).importClause.namedBindings as NamedImports).elements.forEach(e => {
            context[e.name.text] = false;
        });
    }

    for (const name of POSSIBLE_IMPORTS_TO_ADD) {
        if (context[name]) {
            specifiersToAdd.push(context['infernoImportSpecifiers'].get(name));
        }
    }

    if (specifiersToAdd.length > 0) {
        if (matchedImportIdx === -1) {
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
            const statement = statements[matchedImportIdx];
            const importDeclaration = statement as ImportDeclaration;
            const namedBindings = importDeclaration.importClause.namedBindings as NamedImports;
            const newNamedImports = (namedBindings?.elements || []).concat(specifiersToAdd);
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
                ...statements.slice(0, matchedImportIdx),
                updatedImportDecl,
                ...statements.slice(matchedImportIdx + 1)
            ])
        }

        return factory.updateSourceFile(sourceFile, statements);
    }

    return sourceFile
}
