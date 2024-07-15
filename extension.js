const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let terminal;

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {

	let pythonEvnPath = vscode.workspace.getConfiguration('djangoAccessController').get('pythonEvnPath');
	const pythonEnableEnv = vscode.workspace.getConfiguration('djangoAccessController').get('pythonEnableEnv');
	pythonEvnPath = path.join(pythonEvnPath, 'Scripts', 'python.exe');

	const pythonPath = pythonEnableEnv ? pythonEvnPath : 'python';

	vscode.window.registerTreeDataProvider('package-commands', new DjangoExplorerProvider());
	const endpointsProvider = new EndpointsProvider();
	vscode.window.createTreeView('package-endpoints', { treeDataProvider: endpointsProvider });

	vscode.commands.registerCommand('django-tool.refresh-endpoint', () => endpointsProvider.refresh());


	const disposable = vscode.commands.registerCommand('django-tool.showCommands', function () {
		vscode.window.showQuickPick([
			'Create Project',
			'Run Django Application',
			'Run Django Application on Different Port & IP',
			'Start App',
			'Make Migrations',
			'Migrate',
			'Create Super User',
			'Collect Static'

		]).then((selected) => {
			if (selected === 'Run Django Application') {
				vscode.commands.executeCommand('django-tool.run');
			} else if (selected === 'Run Django Application on Different Port & IP') {
				vscode.commands.executeCommand('django-tool.run-server-port');
			} else if (selected === 'Create Project') {
				vscode.commands.executeCommand('django-tool.create-project');
			} else if (selected === 'Start App') {
				vscode.commands.executeCommand('django-tool.start-app');
			} else if (selected === 'Make Migrations') {
				vscode.commands.executeCommand('django-tool.make-migrations');
			} else if (selected === 'Migrate') {
				vscode.commands.executeCommand('django-tool.migrate');
			} else if (selected === 'Create Super User') {
				vscode.commands.executeCommand('django-tool.create-superuser');
			} else if (selected === 'Collect Static') {
				vscode.commands.executeCommand('django-tool.collect-static');
			} else {
				vscode.window.showErrorMessage('Invalid Command');
			}
		});
	});

	const createProject = vscode.commands.registerCommand('django-tool.create-project', function () {
		vscode.window.showInputBox({ prompt: "Enter Project Name" }).then((projectName) => {
			if (!projectName) {
				vscode.window.showErrorMessage("Please provide valid Project Name");
				return
			};
			projectName = projectName.replace(/\s+/g, '_');
			projectName = projectName.toLowerCase();
			runCommandInTerminal(`django-admin startproject ${projectName}`);
			runCommandInTerminal(`cd ${projectName}`);
			runCommandInTerminal('code .');
			vscode.window.showInformationMessage(`django-admin startproject ${projectName}`);
		});
	});

	const runServer = vscode.commands.registerCommand('django-tool.run', function () {
		runCommandInTerminal(`${pythonPath} manage.py runserver`);
		vscode.window.showInformationMessage(`${pythonPath} manage.py runserver`, 'Open Browser').then((value) => {
			;
			if (value === 'Open Browser')
				vscode.env.openExternal(vscode.Uri.parse('http://localhost:8000/'));
		});
	});

	const runServerPort = vscode.commands.registerCommand('django-tool.run-server-port', function () {
		vscode.window.showInputBox({ prompt: "Enter Ip address" }).then((ip) => {
			vscode.window.showInputBox({ prompt: "Enter Port" }).then((port) => {
				if (!ip) {
					vscode.window.showErrorMessage("Please provide valid IP");
					return
				};
				if (!port) {
					port = 8000;
				}
				runCommandInTerminal(`${pythonPath} manage.py runserver ${ip}:${port}`);
				vscode.window.showInformationMessage(`python manage.py runserver ${ip}:${port}`, 'Open Browser').then((value) => {
					if (value === 'Open Browser')
						vscode.env.openExternal(vscode.Uri.parse(`http://${ip}:${port}/`));
				});
			});
		});
	});

	const startApp = vscode.commands.registerCommand('django-tool.start-app', function () {
		vscode.window.showInputBox({ prompt: "Enter App Name" }).then((appName) => {
			if (!appName) {
				vscode.window.showErrorMessage("Please provide valid App Name");
				return
			};
			runCommandInTerminal(`${pythonPath} manage.py startapp ${appName}`);
			vscode.window.showInformationMessage(`python manage.py startapp ${appName}`);
		});
	});

	const makemigrations = vscode.commands.registerCommand('django-tool.make-migrations', function () {
		runCommandInTerminal(`${pythonPath} manage.py makemigrations`);
		vscode.window.showInformationMessage('python manage.py makemigrations');
	});


	const migrate = vscode.commands.registerCommand('django-tool.migrate', function () {
		runCommandInTerminal(`${pythonPath} manage.py migrate`);
		vscode.window.showInformationMessage('python manage.py migrate');
	});

	const createSuperUser = vscode.commands.registerCommand('django-tool.create-superuser', function () {
		runCommandInTerminal(`${pythonPath} manage.py createsuperuser`);
		vscode.window.showInformationMessage('python manage.py createsuperuser');
	});

	const collectStatic = vscode.commands.registerCommand('django-tool.collect-static', function () {
		runCommandInTerminal(`${pythonPath} manage.py collectstatic`);
		vscode.window.showInformationMessage('python manage.py collectstatic');
	});

	context.subscriptions.push(disposable, runServer, migrate, createSuperUser, runServerPort, createProject, collectStatic, startApp, makemigrations);
}

class EndpointsProvider {
	constructor() {
		this._onDidChangeTreeData = new vscode.EventEmitter();
		this.onDidChangeTreeData = this._onDidChangeTreeData.event;
		this.endpoints = [];
	}

	refresh() {
		this.endpoints = [];
		this._onDidChangeTreeData.fire();
	}

	async getChildren(element) {
		if (!element) {
			const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
			if (!workspaceFolder) {
				vscode.window.showErrorMessage('No open workspace');
				return [];
			}

			const filePaths = await vscode.workspace.findFiles('**/urls.py', null, 10);

			if (!filePaths.length) {
				vscode.window.showErrorMessage('File not found: urls.py');
				return [];
			}

			for (const filePath of filePaths) {
				try {
					const fileContent = await fs.promises.readFile(filePath.fsPath, 'utf-8');
					const extractedData = extractUrlsFromContent(fileContent, filePath);
					this.endpoints.push(...extractedData.map(data => new UrlTreeItem(data.name,data.viewFunction, data.filePath, data.lineNumber)));
				} catch (error) {
					// console.error('Error processing file:', error);
					vscode.window.showErrorMessage('Error processing file: ' + error.message);
				}
			}

			return this.endpoints;
		}
		return [];
	}

	getTreeItem(element) {
		return element;
	}
}

class UrlTreeItem extends vscode.TreeItem {
	constructor(name,viewFunction, filePath, lineNumber) {
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
		this.label = `/${this.name}`;
		this.tooltip = `${this.name} - (${this.viewFunction}) - ${this.filePath}`;
		this.iconPath = new vscode.ThemeIcon('link');
	}
}

function extractUrlsFromContent(content, filePath) {
	// const regex = /path\(['"]([^'"]+)['"]/g;
	// const matches = [];
	// const lines = content.split('\n');
	// lines.forEach((line, index) => {
	// 	let match;
	// 	while ((match = regex.exec(line)) !== null) {
	// 		matches.push({ name: match[1], filePath: filePath.fsPath, lineNumber: index });
	// 	}
	// });
	// return matches;
	const urlPatternRegex = /urlpatterns\s*=\s*\[([\s\S]*?)\]/g;
	const pathRegex = /path\(['"]([^'"]+)['"],\s*([^)]+)\)/g;
  
    const matches = [];
	let urlPatternMatch;
  
	while ((urlPatternMatch = urlPatternRegex.exec(content)) !== null) {
	  const urlPatternsContent = urlPatternMatch[1];
  
	  let pathMatch;
	  const lines = urlPatternsContent.split('\n');
	  lines.forEach((line, index) => {
		while ((pathMatch = pathRegex.exec(line)) !== null) {
                matches.push({
                    name: pathMatch[1],
                    viewFunction: pathMatch[2],
                    filePath: filePath.fsPath,
			lineNumber: index
		  });
		}
	  });
	}
  
    return matches;
  }
  
  

function runCommandInTerminal(command) {
	if (!terminal || terminal.exitStatus !== undefined) {
		terminal = vscode.window.createTerminal('Django Terminal');
	}

	terminal.show();
	terminal.sendText(command);
}


function deactivate() {
	if (terminal) {
		terminal.dispose();
	}
}

class DjangoExplorerProvider {
	getTreeItem(element) {
		return element;
	}

	getChildren() {
		return Promise.resolve([
			new ActionTreeItem('Create Django Project', 'Create a new Django project', 'create-project'),
			new ActionTreeItem('Run Django Server', 'Run the Django development server', 'run'),
			new ActionTreeItem('Run Django with server and port', 'Run the Django development server in specific port and ip', 'run-server-port'),
			new ActionTreeItem('Create Django App', 'Create a application', 'start-app'),
			new ActionTreeItem('Make Migrations', 'Make migrations for the database', 'make-migrations'),
			new ActionTreeItem('Migrate Database', 'Migrate the database', 'migrate'),
			new ActionTreeItem('Create Superuser', 'Create a Django superuser', 'create-superuser'),
			new ActionTreeItem('Collect Static', 'Collect static files', 'collect-static'),
		]);
	}
}

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


module.exports = {
	activate,
	deactivate
};
