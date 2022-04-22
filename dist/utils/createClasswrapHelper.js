"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var classwrapHelper = {
    name: "typescript:classwrap",
    scoped: false,
    priority: 1,
    text: "\n        var __classwrap = function(classes, prefix) {\n          var value\n          var className = \"\"\n          var type = typeof classes\n        \n          if ((classes && type === \"string\") || type === \"number\") {\n            return classes\n          }\n        \n          prefix = prefix || \" \"\n        \n          if (Array.isArray(classes) && classes.length) {\n            for (var i = 0, l = classes.length; i < l; i++) {\n              if ((value = __classwrap(classes[i], prefix))) {\n                className += (className && prefix) + value\n              }\n            }\n          } else {\n            for (var i in classes) {\n              if (classes.hasOwnProperty(i) && (value = classes[i])) {\n                className +=\n                  (className && prefix) +\n                  i +\n                  (typeof value === \"object\" ? __classwrap(value, prefix + i) : \"\")\n              }\n            }\n          }\n        \n          return className\n        }"
};
function createClasswrapHelper(context, attributesSegments) {
    var factory = context.factory;
    function getHelperName(name) {
        return ts.setEmitFlags(factory.createIdentifier(name), ts.EmitFlags.HelperName | ts.EmitFlags.AdviseOnEmitNode);
    }
    context.requestEmitHelper(classwrapHelper);
    return factory.createCallExpression(getHelperName("__classwrap"), 
    /*typeArguments*/ undefined, attributesSegments);
}
exports.default = createClasswrapHelper;
