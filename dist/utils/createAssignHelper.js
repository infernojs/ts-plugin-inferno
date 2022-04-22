"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var assignHelper = {
    name: "typescript:assign",
    scoped: false,
    priority: 1,
    text: "\n        var __assign = (this && this.__assign) || Object.assign || function(t) {\n            for (var s, i = 1, n = arguments.length; i < n; i++) {\n                s = arguments[i];\n                for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))\n                    t[p] = s[p];\n            }\n            return t;\n        };"
};
function createAssignHelper(context, attributesSegments) {
    var factory = context.factory;
    if (context.getCompilerOptions().target >= ts.ScriptTarget.ES2015) {
        return factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier("Object"), "assign"), 
        /*typeArguments*/ undefined, attributesSegments);
    }
    context.requestEmitHelper(assignHelper);
    return factory.createCallExpression(getHelperName("__assign"), 
    /*typeArguments*/ undefined, attributesSegments);
    function getHelperName(name) {
        return ts.setEmitFlags(factory.createIdentifier(name), ts.EmitFlags.HelperName | ts.EmitFlags.AdviseOnEmitNode);
    }
}
exports.default = createAssignHelper;
