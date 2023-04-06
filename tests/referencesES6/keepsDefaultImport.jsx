import Inferno, { render, Component, createVNode, createComponentVNode } from "inferno";
import { Incrementer } from "./components/Incrementer";
const container = document.getElementById("app");
class MyComponent extends Component {
    constructor(props, context) {
        super(props, context);
        this.tsxVersion = 2.34; /* This is typed value */
    }
    render() {
        return (createVNode(1, "div", null, [createVNode(1, "h1", null, `Welcome to Inferno ${Inferno.version} TSX ${this.tsxVersion}`, 0), createComponentVNode(2, Incrementer, { "name": "Crazy button" })], 4));
    }
}
render(createComponentVNode(2, MyComponent), container);
