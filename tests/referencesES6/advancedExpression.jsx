import { createVNode, createComponentVNode } from "inferno";
function MyComponent(props) {
    return (createVNode(1, "div", null, [createVNode(1, "span", null, props.name, 0), createComponentVNode(2, MyComponent), createVNode(1, "div", null, props.children.map(child => createVNode(1, "div", null, child, 0)), 0)], 4));
}
