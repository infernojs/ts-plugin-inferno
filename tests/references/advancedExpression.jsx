var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newComponentVNode = $inferno.newComponentVNode;
function MyComponent(props) {
    return (newVNode(5, "div", null, [newVNode(1, "span", null, props.name), newComponentVNode(0, MyComponent), newVNode(1, "div", null, props.children.map(function (child) {
            return newVNode(1, "div", null, child);
        }))]));
}
