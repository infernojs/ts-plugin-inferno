var $inferno = require("inferno");
var createComponentVNode = $inferno.createComponentVNode;
createComponentVNode(2, MemoryRouter, { "initialEntries": ['/pizza'], "children": createComponentVNode(2, NavLink, { "to": function (isActive) { return (isActive ? 'active-pizza' : 'chill-pizza'); }, "className": function (isActive) { return (isActive ? 'active-pizza' : 'chill-pizza'); }, "children": "Pizza!" }) }),
;
