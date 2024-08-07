const vscode = require('vscode');
const path = require('path');
const axios = require('axios');
const marked = require('marked');
const ModelTreeDataProvider = require('./Helper/modelTreeProvider');
const ModelGenerator = require('./Helper/ModelCreate');
const ActionTreeItem = require('./Helper/ActionItem');
const EndpointsProvider = require('./Helper/EndpointsProvider');

let terminal;
let loadModel = [];

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
			// Remove white spaces from model name
			if(appName.includes(" ")){
				appName = appName.replaceAll(/\s+/g, '_');
			}
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

	const searchQueryByAI = vscode.commands.registerCommand('django-tool.searchByAI', function () {
		vscode.window.showInputBox({ prompt: "Enter Search Query" }).then((query) => {
			if (!query) {
				vscode.window.showErrorMessage("Please provide valid Search Query");
				return
			};
			searchByAI(query, context);
		});
	});

	const modelTreeDataProvider = new ModelTreeDataProvider();
	const modelGenerator = new ModelGenerator();

	vscode.window.createTreeView('package-models', { treeDataProvider: modelTreeDataProvider });

	const modelGen = vscode.commands.registerCommand('django-tool.model-gen', async function () {
		let fileUri = await vscode.workspace.findFiles('**/models.py', null, 10);
		let selectedOption = fileUri[0].fsPath;
		let options = fileUri.map((file) => file.fsPath);
		if (fileUri && fileUri.length > 1) {
			selectedOption = await vscode.window.showQuickPick(options, {
				placeHolder: 'Select a Model file'
			});
		}

		if (selectedOption) {
			let modelStructure = [];
			let continueLoop = true;

			while (continueLoop) {
				const processOptions = ["Create Table", "Submit"];
				const selectedOption = await vscode.window.showQuickPick(processOptions, {
					placeHolder: 'Select an option'
				});

				if (selectedOption === "Submit") {
					if (loadModel.length > 0) {
						modelStructure = loadModel;
					}
					continueLoop = false;
					break;
				} else if (selectedOption === "Create Table") {
					let modelName = await vscode.window.showInputBox({ prompt: "Enter Table Name" });
					// Remove white spaces from model name
					if(modelName.includes(" ")){
						modelName = modelName.replaceAll(/\s+/g, '_');
					}
					let Fields = [];
					let isFieldMore = true;
					while (isFieldMore) {
						const processOptions = ["Add Field", "Process"];
						const selectedOption = await vscode.window.showQuickPick(processOptions, {
							placeHolder: 'Select an option'
						});

						if (selectedOption === "Process") {
							isFieldMore = false;
							break;
						} else if (selectedOption === "Add Field") {
							let filedName = await vscode.window.showInputBox({ prompt: "Enter Field Name" });
							// Remove white spaces from field name
							if(filedName.includes(" ")){
								filedName = filedName.replaceAll(/\s+/g, '_');
							}

							if (!filedName) {
								vscode.window.showErrorMessage("Please provide a valid Field Name");
								continue;
							}

							const fieldOptions = ["CharField", "IntegerField", "BooleanField", "DateField", "DateTimeField", "DecimalField", "EmailField", "FileField", "FloatField", "ImageField", "SlugField", "TextField", "TimeField", "URLField"];
							const fieldType = await vscode.window.showQuickPick(fieldOptions, {
								placeHolder: 'Select a Field Type'
							});

							if (fieldType) {
								Fields.push({ filedName, fieldType });

								const modelIndex = modelStructure.findIndex((item) => item.tableName === modelName);
								if (modelIndex === -1) {
									modelStructure.push({ tableName: modelName, fields: Fields });
								} else {
									modelStructure[modelIndex].fields.push(...Fields); // Spread operator to push individual fields
								}

								loadModel = modelStructure;
								modelTreeDataProvider.setModelStructure(loadModel);
								Fields = []; // Clear Fields array after pushing

							} else {
								vscode.window.showErrorMessage("No Field Type selected.");
							}
						} else {
							vscode.window.showWarningMessage("Invalid option selected.");
						}
					}

					if (!modelName) {
						vscode.window.showErrorMessage("Please provide a valid Table Name");
						continue;
					}

					if (Fields.length > 0 && modelStructure.findIndex((item) => item.tableName === modelName) === -1) {
						modelStructure.push({ tableName: modelName, fields: Fields });
						loadModel = modelStructure
						modelTreeDataProvider.setModelStructure(loadModel);
						Fields = []; // Clear Fields array after pushing
					}

				} else {
					vscode.window.showWarningMessage("Invalid option selected.");
				}
			}

			const quickPickItems = modelStructure.map(item => ({
				label: item.tableName,
				description: item.fields.map(field => `${field.filedName} - ${field.fieldType}`).join(', ')
			}));

			const structure = await vscode.window.showQuickPick(quickPickItems, {
				placeHolder: 'Select Tables',
				canPickMany: true
			});

			if (structure) {
				let modelsFileInformation = modelStructure.filter((item) => {
					return structure.find((selectedItem) => selectedItem.label === item.tableName);
				});

				let loadModel = modelStructure.filter((item) => {
					return structure.find((selectedItem) => selectedItem.label === item.tableName);
				});

				modelTreeDataProvider.setModelStructure(loadModel); // update

				modelsFileInformation.forEach((item) => {
					if (item.fields.length <= 0 || item.tableName === "" || item.tableName === undefined) {
						vscode.window.showWarningMessage('Select Table Name and Fields format incorrect.');
						modelsFileInformation = [];
						loadModel = [];
					}
				})

				if (modelsFileInformation.length > 0) {
					modelGenerator.modelCreate(modelsFileInformation, selectedOption);
					loadModel = [];
					modelTreeDataProvider.setModelStructure(loadModel); // refresh
				}
			} else {
				vscode.window.showWarningMessage('No file selected.');
			}
		}
	});

	context.subscriptions.push(disposable, runServer, migrate, createSuperUser, runServerPort, createProject, collectStatic, startApp, makemigrations, searchQueryByAI, modelGen);
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
			new ActionTreeItem('AI Assistant', 'Search Your Query By Gemini', 'searchByAI'),
			new ActionTreeItem('Make a Model', 'Create Model and Link with Admin', 'model-gen'),
		]);
	}
}

async function searchByAI(searchTerm, context) {
	const djangoFormsProvider = new DjangoFormsProvider(context.extensionUri);
	const key = vscode.workspace.getConfiguration('djangoAccessController').get('geminiSecretKey');

	if (!key) {
		vscode.window.showErrorMessage('Please provide a valid API key');
		return;
	}

	let request = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${key}`;

	let userText = searchTerm + " in Django";
	const data = {
		contents: [
			{
				role: "user",
				parts: [
					{
						text: userText
					}
				]
			}
		]
	};

	const headers = {
		'Content-Type': 'application/json',
	};

	try {
		const response = await axios.post(request, data, { headers });
		const content = response.data.candidates[0].content.parts[0].text;

		const htmlContent = marked.parse(content);
		if (htmlContent) {
			const panel = vscode.window.createWebviewPanel(
				'djangoForms',
				'Django Forms Documentation',
				vscode.ViewColumn.One,
				{
					enableScripts: true
				}
			);
			panel.webview.html = djangoFormsProvider.fetchAndGetHtml(htmlContent, userText);
		}
	} catch (error) {
		vscode.window.showErrorMessage(error.message);
	}
}

class DjangoFormsProvider {
	constructor(extensionUri) {
		this.extensionUri = extensionUri;
	}

	fetchAndGetHtml(content, heading) {
		return `
		  <!DOCTYPE html>
		  <html lang="en">
		  <head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Django Forms Documentation</title>
			<style>
			  body {
				font-family: Arial, sans-serif;
				padding: 10px;
			  }
			  a {
				color: blue;
				text-decoration: underline;
			  }
			  pre {
				background: #5531b2;
				color: white;
				padding: 10px;
				border: 1px solid #ddd;
				overflow: auto;
			  }
			  code {
				font-family: monospace;
			  }
			</style>
		  </head>
		  <body>
			<h3>Request : ${heading}</h3>
			<div>
			${content}
			</div>
		  </body>
		  </html>
		`;
	}
}


module.exports = {
	activate,
	deactivate
};
