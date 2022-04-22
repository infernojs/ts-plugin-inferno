"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getName(name) {
    if (name.indexOf("-") !== 0) {
        return ts.factory.createStringLiteral(name);
    }
    return ts.factory.createStringLiteral(name);
}
exports.default = getName;
