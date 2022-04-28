import * as inferno from "inferno";
var createTextVNode = inferno.createTextVNode;
var createFragment = inferno.createFragment;
createFragment([createFragment([Frag, createTextVNode("Text"), Wohoo], 0)], 4);
