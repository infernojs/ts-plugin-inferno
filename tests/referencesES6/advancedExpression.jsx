import { newVNode, newComponentVNode } from "inferno";
function MyComponent(props) {
    return (newVNode(5, "div", null, [newVNode(1, "span", null, props.name), newComponentVNode(0, MyComponent), newVNode(1, "div", null, props.children.map(child => newVNode(1, "div", null, child)))]));
}
