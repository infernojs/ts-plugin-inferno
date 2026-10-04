import { Component, newVNode, newTextVNode } from 'inferno';
export class CustomerImportView extends Component {
    render() {
        return (newVNode(5, "div", "overview", [newVNode(9, "div", "topbanner", newVNode(9, "div", "topheader", newVNode(9, "div", "overview-topheader-section", newVNode(3, "h1", null, "Import data")))), newTextVNode("text"), newVNode(17, "div", "viewcontent")]));
    }
}
