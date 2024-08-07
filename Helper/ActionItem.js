const vscode = require('vscode');

class ActionTreeItem extends vscode.TreeItem {
	constructor(label, tooltip, command) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.tooltip = tooltip;
		this.command = {
			command: `django-tool.${command}`,
			title: label
		};
		// const iconPathLight = path.join(__filename, '..', 'resources', 'play.svg');

		// this.iconPath = {
		// 	light: iconPathLight,
		// 	dark: iconPathLight
		// };
		this.iconPath = new vscode.ThemeIcon('run');
	}
}

module.exports = ActionTreeItem;