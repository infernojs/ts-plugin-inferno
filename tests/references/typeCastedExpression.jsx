var $inferno = require("inferno");
var createComponentVNode = $inferno.createComponentVNode;
createComponentVNode(2, MemoryRouter, { "children": createComponentVNode(2, NavLink, { "to": function (isActive) { return (isActive ? 'active-pizza' : 'chill-pizza'); } }) }),
;
