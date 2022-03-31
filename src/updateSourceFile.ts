import * as ts from "typescript";

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

export default (sourceFile: ts.SourceFile, context, factory: ts.NodeFactory) => {
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

// import * as ts from "typescript";
//
// export default (sourceFile: ts.SourceFile, context) => {
//   let statements = [...sourceFile.statements];
//   const importsToAdd: string[] = [];
//
//   if (context["createFragment"]) {
//     importsToAdd.push('createFragment');
//   }
//   if (context["createVNode"]) {
//     importsToAdd.push('createVNode');
//   }
//   if (context["createComponentVNode"]) {
//     importsToAdd.push('createComponentVNode');
//   }
//   if (context["createTextVNode"]) {
//     importsToAdd.push('createTextVNode');
//   }
//   if (context["normalizeProps"]) {
//     importsToAdd.push('normalizeProps');
//   }
//
//   if (importsToAdd.length > 0) {
//     const importSpecifiers = [];
//
//     for (let i = 0, len = importsToAdd.length; i < len; i++) {
//       importSpecifiers.push(
//           ts.createImportSpecifier(undefined, ts.createIdentifier(importsToAdd[i]))
//       )
//     }
//
//     statements.unshift(
//         ts.createImportDeclaration(
//             undefined,
//             undefined,
//             ts.createImportClause(
//                 undefined,
//                 ts.createNamedImports(importSpecifiers)
//             ),
//             ts.createLiteral("inferno")
//         )
//     );
//   }
//   return ts.updateSourceFileNode(sourceFile, statements);
// };
