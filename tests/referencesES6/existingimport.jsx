import { Component, createVNode, createTextVNode } from 'inferno';
export class CustomerImportView extends Component {
    render() {
        return (createVNode(1, "div", "overview", [createVNode(1, "div", "topbanner", createVNode(1, "div", "topheader", createVNode(1, "div", "overview-topheader-section", createVNode(1, "h1", null, "Import data", 16), 2), 2), 2), createTextVNode("text"), createVNode(1, "div", "viewcontent")], 4));
    }
}
