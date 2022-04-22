"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function isTargetHigherThanES5(context) {
    return (context.getCompilerOptions().target > ts.ScriptTarget.ES5 && context.getCompilerOptions().module !== ts.ModuleKind.UMD);
}
exports.default = isTargetHigherThanES5;
