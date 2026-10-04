var $inferno = require("inferno");
var newComponentVNode = $inferno.newComponentVNode;
newComponentVNode(0, MemoryRouter, { "initialEntries": ['/pizza'], "children": newComponentVNode(0, NavLink, { "to": function (isActive) { return (isActive ? 'active-pizza' : 'chill-pizza'); }, "className": function (isActive) { return (isActive ? 'active-pizza' : 'chill-pizza'); }, "children": "Pizza!" }) }),
;
