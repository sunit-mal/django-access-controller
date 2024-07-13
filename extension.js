const vscode = require('vscode');
const path = require('path');

let terminal;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	vscode.window.registerTreeDataProvider('package-commands', new DjangoExplorerProvider());

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
		runCommandInTerminal('python manage.py runserver');
		vscode.window.showInformationMessage('python manage.py runserver', 'Open Browser').then((value) => {
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
				runCommandInTerminal(`python manage.py runserver ${ip}:${port}`);
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
			runCommandInTerminal(`python manage.py startapp ${appName}`);
			vscode.window.showInformationMessage(`python manage.py startapp ${appName}`);
		});
	});

	const makemigrations = vscode.commands.registerCommand('django-tool.make-migrations', function () {
		runCommandInTerminal('python manage.py makemigrations');
		vscode.window.showInformationMessage('python manage.py makemigrations');
	});


	const migrate = vscode.commands.registerCommand('django-tool.migrate', function () {
		runCommandInTerminal('python manage.py migrate');
		vscode.window.showInformationMessage('python manage.py migrate');
	});

	const createSuperUser = vscode.commands.registerCommand('django-tool.create-superuser', function () {
		runCommandInTerminal('python manage.py createsuperuser');
		vscode.window.showInformationMessage('python manage.py createsuperuser');
	});

	const collectStatic = vscode.commands.registerCommand('django-tool.collect-static', function () {
		runCommandInTerminal('python manage.py collectstatic');
		vscode.window.showInformationMessage('python manage.py collectstatic');
	});

	context.subscriptions.push(disposable, runServer, migrate, createSuperUser, runServerPort, createProject, collectStatic, startApp, makemigrations);

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
		const iconPathLight = path.join(__filename, '..', 'resources', 'play.svg');

		this.iconPath = {
			light: iconPathLight,
			dark: iconPathLight
		};
	}
}

module.exports = {
	activate,
	deactivate
};
