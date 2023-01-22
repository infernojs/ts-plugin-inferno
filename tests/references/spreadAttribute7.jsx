var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = argumenlength; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var inferno = require("inferno");
var normalizeProps = inferno.normalizeProps;
var createVNode = inferno.createVNode;
normalizeProps(createVNode(1, "div", null, null, 1, __assign({}, props, other, { "foo": "bar", "foo2": "bar2" }, more, { "foo3": "bar3" })));
