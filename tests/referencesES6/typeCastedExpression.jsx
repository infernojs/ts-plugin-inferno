import { createComponentVNode } from "inferno";
createComponentVNode(2, MemoryRouter, { "children": createComponentVNode(2, NavLink, { "to": (isActive) => (isActive ? 'active-pizza' : 'chill-pizza') }) }),
;
