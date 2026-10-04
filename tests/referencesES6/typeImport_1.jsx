import { newVNode } from "inferno";
import { a } from "./test";
export function Visualizer({ number, other }) {
    return (newVNode(1, "div", "visualizer test", [a, number, other]));
}
