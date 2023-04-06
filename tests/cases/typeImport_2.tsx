// import {createVNode} from "inferno"; // If this line is uncommented, no problems
import {InfernoNode} from "inferno";
import {a} from "./test";

type VisualizerProps = {
    number: string;
    other?: InfernoNode;
}

export function Visualizer({ number, other }: VisualizerProps) {
    return (
        <div className="visualizer test">
            {a}
            {number}
            {other}
        </div>
    );
}
