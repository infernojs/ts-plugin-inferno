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
var createTextVNode = $inferno.createTextVNode;
var createVNode = $inferno.createVNode;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerImportView = void 0;
var inferno_1 = require("inferno");
var CustomerImportView = /** @class */ (function (_super) {
    __extends(CustomerImportView, _super);
    function CustomerImportView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CustomerImportView.prototype.render = function () {
        return (createVNode(1, "div", "overview", [createVNode(1, "div", "topbanner", createVNode(1, "div", "topheader", createVNode(1, "div", "overview-topheader-section", createVNode(1, "h1", null, "Import data", 16), 2), 2), 2), createTextVNode("text"), createVNode(1, "div", "viewcontent")], 4));
    };
    return CustomerImportView;
}(inferno_1.Component));
exports.CustomerImportView = CustomerImportView;
