const vscode = require('vscode');
const fs = require('fs');
const UrlTreeItem = require('./UrlTreeItem');
const path = require('path');

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

            const settingFile = await vscode.workspace.findFiles('**/settings.py', null, 10);
            if (!settingFile.length) {
                vscode.window.showErrorMessage('File not found: settings.py');
                return [];
            } else {
                const settingContent = await fs.promises.readFile(settingFile[0].fsPath, 'utf-8');
                const match = settingContent.match('ROOT_URLCONF\\s*=\\s*[\'"]([^\'"]+)[\'"]');
                if (!match) {
                    vscode.window.showErrorMessage('ROOT_URLCONF not found in settings.py');
                    return [];
                }
                const rootUrlLocation = workspaceFolder.uri.fsPath + path.sep + match[1].split('.').join(path.sep) + ".py";
                try {
                    await fs.promises.access(rootUrlLocation, fs.constants.F_OK);
                    const fileContent = await fs.promises.readFile(rootUrlLocation, 'utf-8');
                    const urls = await this.extractUrlsFromContent(fileContent, rootUrlLocation);
                    if (!Array.isArray(urls)) {
                        console.error('Expected an array from extractUrlsFromContent');
                        return [];
                    }
                    this.endpoints.push(...urls.map(data => new UrlTreeItem(data.name, data.viewFunction, data.filePath, data.lineNumber)));
                } catch (error) {
                    console.error('Error accessing file:', error);
                }
            }
            return this.endpoints;
        }
        return [];
    }

    getTreeItem(element) {
        return element;
    }

    async extractUrlsFromContent(content, filePath) {
        const urlPatternRegex = /urlpatterns\s*=\s*\[([\s\S]*?)\]/gs;
        const pathRegex = /path\(\s*['"]([^'"]*)['"]\s*,\s*(include\(['"]([^'"]+)['"]\)|[^,]+)(?:\s*,\s*name\s*=\s*['"]([^'"]+)['"])?\s*\)/g;
        // const redirectViewRegex = /RedirectView\.as_view\(\s*url\s*=\s*(settings\.[\w.]+)\s*\+\s*['"]([^'"]+)['"]\)/g;

        const matches = [];
        let urlPatternMatch;

        while ((urlPatternMatch = urlPatternRegex.exec(content)) !== null) {
            const urlPatternsContent = urlPatternMatch[1];
            const lines = urlPatternsContent.split('\n');

            for (let [index, line] of lines.entries()) {
                let pathMatch;
                while ((pathMatch = pathRegex.exec(line)) !== null) {
                    const pathName = pathMatch[1];
                    const includePath = pathMatch[3];
                    const viewFunction = pathMatch[2];

                    if (includePath) {
                        const include_urls = await this.extractIncludeUrls(includePath);
                        for (const url of include_urls) {
                            matches.push({
                                name: pathName.endsWith('/') ? pathName + url.name : pathName + '/' + url.name,
                                viewFunction: viewFunction,
                                filePath: url.filePath,
                                lineNumber: index
                            });
                        }
                    } else {
                        matches.push({
                            name: pathName,
                            viewFunction: viewFunction,
                            filePath: filePath,
                            lineNumber: index
                        });
                    }
                }

                // let redirectMatch;
                // if ((redirectMatch = redirectViewRegex.exec(line)) !== null) {
                //     matches.push({
                //         name: redirectMatch[1] + redirectMatch[2],
                //         viewFunction: 'RedirectView',
                //         filePath: filePath,
                //         lineNumber: index
                //     });
                // }
            }
        }
        return matches;
    }

    async extractIncludeUrls(filePath) {
        const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
        const urlLocation = path.join(workspaceFolder.uri.fsPath, filePath.split('.').join(path.sep) + ".py");
        const include_urls = [];

        try {
            await fs.promises.access(urlLocation, fs.constants.F_OK);
            const fileContent = await fs.promises.readFile(urlLocation, 'utf-8');
            const urls = await this.extractUrlsFromContent(fileContent, urlLocation);

            if (Array.isArray(urls)) {
                include_urls.push(...urls.map((data, index) => ({
                    name: data.name,
                    viewFunction: data.viewFunction,
                    filePath: urlLocation,
                    lineNumber: index
                })));
            } else {
                console.error('Expected urls to be an array, but got:', urls);
            }
        } catch (error) {
            console.error('Error accessing file:', error);
        }
        return include_urls;
    }
}

module.exports = EndpointsProvider;
