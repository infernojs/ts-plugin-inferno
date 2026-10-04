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
var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newComponentVNode = $inferno.newComponentVNode;
Object.defineProperty(exports, "__esModule", { value: true });
var inferno_1 = require("inferno");
var GenericPrinter = /** @class */ (function (_super) {
    __extends(GenericPrinter, _super);
    function GenericPrinter(props) {
        var _this = _super.call(this, props) || this;
        _this.state = {};
        return _this;
    }
    GenericPrinter.prototype.render = function () {
        var content = newComponentVNode(0, this.props.Template, { "Data": this.props.Data });
        return newVNode(1, "div", null, content);
    };
    return GenericPrinter;
}(inferno_1.Component));
function Test(props) {
    return newVNode(1, "div", null, props.Data.toString());
}
(0, inferno_1.render)(newComponentVNode(0, GenericPrinter, { "Template": Test, "Data": 'lol' }), document.body);
