const vscode = require('vscode');

class ModelTreeDataProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.modelStructure = [];
    }

    setModelStructure(newStructure) {
        this.modelStructure = newStructure;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        const treeItem = new vscode.TreeItem(
            element.label,
            element.collapsibleState
        );
        treeItem.description = element.description;
        return treeItem;
    }

    getChildren(element) {
        if (!element) {
            return this.modelStructure.map(item => ({
                label: item.tableName,
                collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
                fields: item.fields
            }));
        } else {
            return element.fields.map(field => ({
                label: `${field.filedName} - ${field.fieldType}`,
                collapsibleState: vscode.TreeItemCollapsibleState.None
            }));
        }
    }
}

module.exports = ModelTreeDataProvider;
