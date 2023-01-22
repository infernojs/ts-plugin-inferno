"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var inferno_1 = require("inferno");
var createComponentVNode = inferno_1.createComponentVNode;
var createVNode = inferno_1.createVNode;
var Incrementer_1 = require("./components/Incrementer");
var container = document.getElementById("app");
var MyComponent = /** @class */ (function (_super) {
    __extends(MyComponent, _super);
    function MyComponent(props, context) {
        var _this = _super.call(this, props, context) || this;
        _this.tsxVersion = 2.34; /* This is typed value */
        return _this;
    }
    MyComponent.prototype.render = function () {
        return (createVNode(1, "div", null, [createVNode(1, "h1", null, "Welcome to Inferno ".concat(inferno_1.default.version, " TSX ").concat(this.tsxVersion), 0), createComponentVNode(2, Incrementer_1.Incrementer, { "name": "Crazy button" })], 4));
    };
    return MyComponent;
}(inferno_1.Component));
(0, inferno_1.render)(createComponentVNode(2, MyComponent), container);
