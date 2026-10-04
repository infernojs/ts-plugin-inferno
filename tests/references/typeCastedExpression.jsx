var $inferno = require("inferno");
var newComponentVNode = $inferno.newComponentVNode;
newComponentVNode(0, MemoryRouter, { "children": newComponentVNode(0, NavLink, { "to": function (isActive) { return (isActive ? 'active-pizza' : 'chill-pizza'); } }) }),
;
