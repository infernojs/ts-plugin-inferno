import { createVNode } from "inferno";
import { a } from "./test";
export function Visualizer({ number, other }) {
    return (createVNode(1, "div", "visualizer test", [a, number, other], 0));
}
