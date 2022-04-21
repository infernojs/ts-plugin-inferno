import { Component, render, createVNode, createComponentVNode } from 'inferno';
class GenericPrinter extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }
    render() {
        let content = createComponentVNode(2, this.props.Template, { "Data": this.props.Data });
        return createVNode(1, "div", null, content, 0);
    }
}
function Test(props) {
    return createVNode(1, "div", null, props.Data.toString(), 0);
}
render(createComponentVNode(2, GenericPrinter, { "Template": Test, "Data": 'lol' }), document.body);
