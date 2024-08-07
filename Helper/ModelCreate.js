const fs = require('fs');
const vscode = require('vscode');

class ModelGenerator {

    constructor() {
        this.modelFileStructure = "\n";
        this.adminImport = "from django.contrib import admin\nfrom .models import";
        this.adminStructure = "\n";
        this.filePath = "";
        this.registerStructure = "@admin.register(";
        this.multipleTable = false;
        this.adminPath = "";
    }

    createStructure(tableName) {
        this.modelFileStructure += `class ${tableName.tableName}(models.Model):\n`;
        if (this.multipleTable)
            this.adminImport += ` ${tableName.tableName},`;
        else
            this.adminImport += ` ${tableName.tableName}`;

        this.adminStructure += `${this.registerStructure}${tableName.tableName})\nclass ${tableName.tableName}Admin(admin.ModelAdmin):\n\tlist_display = [${tableName.fields.map(field => `'${field.filedName}'`).join(', ')}]\n`;
        while (tableName.fields.length > 0) {
            this.modelFileStructure += `\t${tableName.fields[tableName.fields.length - 1].filedName} = models.${tableName.fields[tableName.fields.length - 1].fieldType}()\n`;
            tableName.fields.pop();
        }
    }

    createAdmin() {
        this.adminPath = this.filePath.replace('models.py', 'admin.py');
        let fileContent = fs.readFileSync(this.adminPath, 'utf8');

        if (!fileContent.includes("from django.contrib import admin")) {
            fileContent = this.adminImport + fileContent;
        } else
            fileContent = fileContent.replace("from django.contrib import admin", this.removeLastComma(this.adminImport));
        fileContent += this.adminStructure;
        fs.writeFileSync(this.adminPath, fileContent);
    }

    modelCreate(modelStructure, fileContent) {
        this.filePath = fileContent;
        if (modelStructure.length > 1)
            this.multipleTable = true;
        modelStructure.forEach(model => {
            this.createStructure(model);
        });
        this.createModelFile();
        this.createAdmin();

        vscode.window.showInformationMessage(`Please check once models.py and admin.py`, 'Open Files').then((value) => {
            if (value === 'Open Files') {
                this.openFile(this.filePath);
                this.openFile(this.adminPath);
            }
        });
    }

    createModelFile() {
        let fileContent = fs.readFileSync(this.filePath, 'utf8');
        fileContent += this.modelFileStructure;
        fs.writeFileSync(this.filePath, fileContent);
    }

    removeLastComma(str) {
        if (str.endsWith(',')) {
            return str.slice(0, -1);
        }
        return str;
    }

    openFile(filePath) {
        vscode.workspace.openTextDocument(filePath).then(doc => {
            vscode.window.showTextDocument(doc, {
                viewColumn: vscode.ViewColumn.Beside,
                preview: false
            });
        });
    }
}

module.exports = ModelGenerator;