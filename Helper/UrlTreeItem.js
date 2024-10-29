const vscode = require('vscode');

class UrlTreeItem extends vscode.TreeItem {
	constructor(name, viewFunction, filePath, lineNumber) {
		super(name, vscode.TreeItemCollapsibleState.None);
		this.name = name;
		this.filePath = filePath;
		this.lineNumber = lineNumber;
		this.viewFunction = viewFunction;
		this.command = {
			command: 'vscode.open',
			title: '',
			arguments: [vscode.Uri.file(filePath), { selection: new vscode.Range(new vscode.Position(lineNumber, 0), new vscode.Position(lineNumber, 0)) }]
		};
		this.label = this.labelName;
		this.tooltip = `${this.name} - (${this.viewFunction}) - ${this.filePath}`;
		this.iconPath = new vscode.ThemeIcon('link');
	}

	get labelName() {
		if (this.name.startsWith('/')) {
			return this.name;
		} else {
			return `/${this.name}`;
		}
	}
}


module.exports = UrlTreeItem;