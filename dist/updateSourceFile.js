"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var isTargetHigherThanES5_1 = require("./utils/isTargetHigherThanES5");
var index_1 = require("./index");
var isImportDeclaration_1 = require("./utils/isImportDeclaration");
var isNamedImports_1 = require("./utils/isNamedImports");
var isMutable_1 = require("./utils/isMutable");
function createVarStatement(name, identifier) {
    return ts.factory.createVariableStatement(undefined, [
        ts.factory.createVariableDeclaration(name, undefined, undefined, ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier(identifier), ts.factory.createIdentifier(name)))
    ]);
}
exports.default = (function (sourceFile, context) {
    var factory = context.factory;
    if ((0, isTargetHigherThanES5_1.default)(context)) {
        var statements = sourceFile.statements;
        var matchedImportIdx = statements
            .findIndex(function (s) { return ts.isImportDeclaration(s)
            && s.moduleSpecifier.text === 'inferno'; });
        // Inferno import statement already exists, and we do not want to add imports for functions already imported, so removing those from context.
        if (matchedImportIdx !== -1) {
            statements[matchedImportIdx].importClause.namedBindings.elements.forEach(function (e) {
                context[e.name.text] = false;
            });
        }
        var specifiersToAdd = [];
        for (var _i = 0, POSSIBLE_IMPORTS_TO_ADD_1 = index_1.POSSIBLE_IMPORTS_TO_ADD; _i < POSSIBLE_IMPORTS_TO_ADD_1.length; _i++) {
            var name_1 = POSSIBLE_IMPORTS_TO_ADD_1[_i];
            if (context[name_1]) {
                specifiersToAdd.push(context['infernoImportSpecifiers'].get(name_1));
            }
        }
        if (specifiersToAdd.length > 0) {
            if (matchedImportIdx === -1) {
                var importStatement = factory.createImportDeclaration(undefined, undefined, factory.createImportClause(false, undefined, factory.createNamedImports(specifiersToAdd)), factory.createStringLiteral('inferno'));
                importStatement.parent = sourceFile;
                statements = Object.assign(__spreadArray([importStatement], statements, true), { pos: statements.pos, end: statements.end, hasTrailingComma: statements.hasTrailingComma });
            }
            else {
                var statement = statements[matchedImportIdx];
                if (!(0, isImportDeclaration_1.isImportDeclaration)(statement)) {
                    throw new Error('Unexpected non-import statement');
                }
                var namedBindings = statement.importClause.namedBindings;
                if (!namedBindings) {
                    throw new Error('Unexpected import statement without import bindings');
                }
                if (!(0, isNamedImports_1.isNamedImports)(namedBindings)) {
                    throw new Error('Unexpected import statement with non-named import bindings');
                }
                if (!(0, isMutable_1.isMutable)(namedBindings)) {
                    throw new Error('Unexpected immutable import statement');
                }
                namedBindings.elements = Object.assign(namedBindings.elements.concat(specifiersToAdd), {
                    hasTrailingComma: namedBindings.elements.hasTrailingComma,
                    pos: namedBindings.elements.pos,
                    end: namedBindings.elements.end
                });
            }
        }
        return factory.updateSourceFile(sourceFile, statements);
    }
    else {
        var statements = __spreadArray([], sourceFile.statements, true);
        var specifiersToAdd = [];
        for (var _a = 0, POSSIBLE_IMPORTS_TO_ADD_2 = index_1.POSSIBLE_IMPORTS_TO_ADD; _a < POSSIBLE_IMPORTS_TO_ADD_2.length; _a++) {
            var name_2 = POSSIBLE_IMPORTS_TO_ADD_2[_a];
            if (context[name_2]) {
                specifiersToAdd.push(context['infernoImportSpecifiers'].get(name_2).name.text);
            }
        }
        if (specifiersToAdd.length > 0) {
            for (var _b = 0, specifiersToAdd_1 = specifiersToAdd; _b < specifiersToAdd_1.length; _b++) {
                var specifier = specifiersToAdd_1[_b];
                statements.unshift(createVarStatement(specifier, 'inferno'));
            }
            statements.unshift(factory.createImportDeclaration(undefined, undefined, factory.createImportClause(undefined, undefined, factory.createNamespaceImport(factory.createIdentifier("inferno"))), factory.createStringLiteral("inferno")));
        }
        return factory.updateSourceFile(sourceFile, statements);
    }
});
