import * as ts from "typescript";
import isTargetHigherThanES2015 from "./utils/isTargetHigherThanES2015";
import {Mutable, POSSIBLE_IMPORTS_TO_ADD} from "./index";
import {isImportDeclaration} from "./utils/isImportDeclaration";
import {isNamedImports} from "./utils/isNamedImports";
import {isMutable} from "./utils/isMutable";

function createVarStatement(name: string) {
  return ts.factory.createVariableStatement(undefined, [
    ts.factory.createVariableDeclaration(
      name,
      undefined,
      undefined,
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier("Inferno"),
        ts.factory.createIdentifier(name)
      )
    )
  ]);
}

export default (sourceFile: ts.SourceFile, context: ts.TransformationContext) => {
  const {factory} = context;

  if (isTargetHigherThanES2015(context)) {
    let statements = sourceFile.statements;
    const matchedImportIdx = statements
        .findIndex(s => ts.isImportDeclaration(s)
            && (s.moduleSpecifier as ts.StringLiteral).text === 'inferno'
        );

    // Inferno import statement already exists, and we do not want to add imports for functions already imported, so removing those from context.
    if (matchedImportIdx !== -1) {
      ((statements[matchedImportIdx] as ts.ImportDeclaration).importClause.namedBindings as ts.NamedImports).elements.forEach(e => {
        context[e.name.text] = false;
      });
    }

    const specifiersToAdd: ts.ImportSpecifier[] = [];

    for (const name of POSSIBLE_IMPORTS_TO_ADD) {
      if (context[name]) {
        specifiersToAdd.push(context['infernoImportSpecifiers'].get(name));
      }
    }

    if (specifiersToAdd.length > 0) {
      if (matchedImportIdx === -1) {
        const importStatement = factory.createImportDeclaration(
            undefined,
            undefined,
            factory.createImportClause(
                false,
                undefined,
                factory.createNamedImports(specifiersToAdd)
            ),
            factory.createStringLiteral('inferno')
        );
        (importStatement as Mutable<ts.ImportDeclaration>).parent = sourceFile;
        statements = Object.assign([importStatement, ...statements], {pos: statements.pos, end: statements.end, hasTrailingComma: statements.hasTrailingComma});
      } else {
        const statement = statements[matchedImportIdx];

        if (!isImportDeclaration(statement)) {
          throw new Error('Unexpected non-import statement');
        }

        const namedBindings = statement.importClause.namedBindings;

        if (!namedBindings) {
          throw new Error('Unexpected import statement without import bindings');
        }

        if (!isNamedImports(namedBindings)) {
          throw new Error('Unexpected import statement with non-named import bindings');
        }

        if (!isMutable(namedBindings)) {
          throw new Error('Unexpected immutable import statement');
        }

        namedBindings.elements = Object.assign(
            namedBindings.elements.concat(specifiersToAdd),
            {
              hasTrailingComma: namedBindings.elements.hasTrailingComma,
              pos: namedBindings.elements.pos,
              end: namedBindings.elements.end
            }
        );
      }
    }

    return factory.updateSourceFile(sourceFile, statements);
  } else {
    let statements = [...sourceFile.statements];
    let shouldAddImport = false;

    if (context["createFragment"]) {
      shouldAddImport = true;
      statements.unshift(createVarStatement("createFragment"));
    }
    if (context["createVNode"]) {
      shouldAddImport = true;
      statements.unshift(createVarStatement("createVNode"));
    }
    if (context["createComponentVNode"]) {
      shouldAddImport = true;
      statements.unshift(createVarStatement("createComponentVNode"));
    }
    if (context["createTextVNode"]) {
      shouldAddImport = true;
      statements.unshift(createVarStatement("createTextVNode"));
    }
    if (context["normalizeProps"]) {
      shouldAddImport = true;
      statements.unshift(createVarStatement("normalizeProps"));
    }

    if (shouldAddImport) {
      const matchedImportIdx = statements
          .findIndex(s => ts.isImportDeclaration(s)
              && (s.moduleSpecifier as ts.StringLiteral).text === 'inferno'
          );

      //@ts-ignore
      const i = statements[matchedImportIdx];
      statements.unshift(
          factory.createImportDeclaration(
              undefined,
              undefined,
              factory.createImportClause(
                  undefined,
                  undefined,
                  factory.createNamespaceImport(factory.createIdentifier("Inferno"))
              ),
              factory.createStringLiteral("inferno")
          )
      );
    }

    return factory.updateSourceFile(sourceFile, statements);
  }
}
