const vscode = require('vscode');
const fs = require('fs');
const UrlTreeItem = require('./UrlTreeItem');

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
                    const extractedData = this.extractUrlsFromContent(fileContent, filePath);
                    this.endpoints.push(...extractedData.map(data => new UrlTreeItem(data.name, data.viewFunction, data.filePath, data.lineNumber)));
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

    extractUrlsFromContent(content, filePath) {
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
}

module.exports = EndpointsProvider;