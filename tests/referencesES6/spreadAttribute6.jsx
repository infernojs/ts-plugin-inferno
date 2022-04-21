import { createComponentVNode, normalizeProps } from "inferno";
createComponentVNode(2, FooBar, { "children": [normalizeProps(createComponentVNode(2, BarFoo, Object.assign({}, props))), createComponentVNode(2, NoNormalize)] });
