import { newComponentVNode, normalizeProps } from "inferno";
newComponentVNode(0, FooBar, { "children": [normalizeProps(newComponentVNode(0, BarFoo, Object.assign({}, props))), newComponentVNode(0, NoNormalize)] });
