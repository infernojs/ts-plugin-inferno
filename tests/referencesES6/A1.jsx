var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "inferno", "inferno"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Inferno = require("inferno");
    var createVNode = Inferno.createVNode;
    var inferno_1 = require("inferno");
    var ExampleClass = /** @class */ (function (_super) {
        __extends(ExampleClass, _super);
        function ExampleClass() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ExampleClass.prototype.render = function () {
            return createVNode(1, "div", null, (0, inferno_1.createVNode)(1, "div", null, 'some text', 0), 0);
        };
        return ExampleClass;
    }(inferno_1.Component));
});
