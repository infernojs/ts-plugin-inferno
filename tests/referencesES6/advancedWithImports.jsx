import { version, render, Component, newVNode, newComponentVNode } from "inferno";
import { Incrementer } from "./components/Incrementer";
const container = document.getElementById("app");
class MyComponent extends Component {
    constructor(props, context) {
        super(props, context);
        this.tsxVersion = 2.34; /* This is typed value */
    }
    render() {
        return (newVNode(5, "div", null, [newVNode(1, "h1", null, `Welcome to Inferno ${version} TSX ${this.tsxVersion}`), newComponentVNode(0, Incrementer, { "name": "Crazy button" })]));
    }
}
render(newComponentVNode(0, MyComponent), container);
