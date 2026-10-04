import { Component, render, newVNode, newComponentVNode } from 'inferno';
class GenericPrinter extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }
    render() {
        let content = newComponentVNode(0, this.props.Template, { "Data": this.props.Data });
        return newVNode(1, "div", null, content);
    }
}
function Test(props) {
    return newVNode(1, "div", null, props.Data.toString());
}
render(newComponentVNode(0, GenericPrinter, { "Template": Test, "Data": 'lol' }), document.body);
