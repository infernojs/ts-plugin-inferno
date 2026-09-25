import {
    ImportDeclaration,
    isImportDeclaration,
    isNamedImports,
    isStringLiteral,
    NamedImports,
    SourceFile,
    TransformationContext
} from "typescript";
import {getDeclaredNames, getPrologueLength} from "./utils/moduleUtils";

export function handleEcmaModules(sourceFile: SourceFile, context: TransformationContext, helpers: string[]) {
    const factory = context.factory;
    const statements = sourceFile.statements;
    // Helpers the file already declares or imports are used as they are, like babel-plugin-inferno does
    const declaredNames = getDeclaredNames(statements)
    const specifiersToAdd = helpers
        .filter(name => !declaredNames.has(name))
        .map(name => factory.createImportSpecifier(false, undefined, factory.createIdentifier(name)))

    if (specifiersToAdd.length === 0) {
        return sourceFile
    }

    // Merge into an existing import { ... } from "inferno", other kinds of inferno imports get a new declaration next to them
    const matchedImportIdx = statements.findIndex(s =>
        isImportDeclaration(s) &&
        isStringLiteral(s.moduleSpecifier) &&
        s.moduleSpecifier.text === 'inferno' &&
        !s.importClause?.isTypeOnly &&
        s.importClause?.namedBindings !== undefined &&
        isNamedImports(s.importClause.namedBindings)
    )

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
        const prologueLength = getPrologueLength(statements);

        (importStatement.parent as any) = sourceFile as any

        return factory.updateSourceFile(sourceFile, [
            ...statements.slice(0, prologueLength),
            importStatement,
            ...statements.slice(prologueLength)
        ], false);
    }

    const importDeclaration = statements[matchedImportIdx] as ImportDeclaration;
    const namedBindings = importDeclaration.importClause.namedBindings as NamedImports;
    const updatedImportDecl = factory.updateImportDeclaration(
        importDeclaration,
        importDeclaration.modifiers,
        factory.updateImportClause(
            importDeclaration.importClause,
            false,
            importDeclaration.importClause.name,
            factory.updateNamedImports(namedBindings, [...namedBindings.elements, ...specifiersToAdd])
        ),
        importDeclaration.moduleSpecifier,
        importDeclaration.attributes
    )

    return factory.updateSourceFile(sourceFile, [
        ...statements.slice(0, matchedImportIdx),
        updatedImportDecl,
        ...statements.slice(matchedImportIdx + 1)
    ], false);
}
