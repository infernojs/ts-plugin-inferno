var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
import * as inferno_1 from "inferno";
var normalizeProps = inferno_1.normalizeProps;
var createComponentVNode = inferno_1.createComponentVNode;
createComponentVNode(2, FooBar, { "children": [normalizeProps(createComponentVNode(2, BarFoo, __assign({}, props))), createComponentVNode(2, NoNormalize)] });
