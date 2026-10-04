import { newComponentVNode } from "inferno";
newComponentVNode(0, MemoryRouter, { "initialEntries": ['/pizza'], "children": newComponentVNode(0, NavLink, { "to": (isActive) => (isActive ? 'active-pizza' : 'chill-pizza'), "className": (isActive) => (isActive ? 'active-pizza' : 'chill-pizza'), "children": "Pizza!" }) }),
;
