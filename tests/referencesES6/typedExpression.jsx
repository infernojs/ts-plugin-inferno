import { createComponentVNode } from "inferno";
createComponentVNode(2, MemoryRouter, { "initialEntries": ['/pizza'], "children": createComponentVNode(2, NavLink, { "to": (isActive) => (isActive ? 'active-pizza' : 'chill-pizza'), "className": (isActive) => (isActive ? 'active-pizza' : 'chill-pizza'), "children": "Pizza!" }) }),
;
