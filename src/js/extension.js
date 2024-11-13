const vscode = require("vscode");

class Project {
  constructor(name, path) {
    this.name = name;
    this.path = path;
    this.totalTime = 0;
    this.lastActivity = null;
    this.isActive = false;
    this.addedDate = Date.now();
  }

  updateActivity() {
    const now = Date.now();
    if (this.isActive && this.lastActivity) {
      const timeDiff = now - this.lastActivity;
      if (timeDiff < 5 * 60 * 1000) {
        this.totalTime += timeDiff;
      }
    }
    this.lastActivity = now;
    this.isActive = true;
  }

  deactivate() {
    this.isActive = false;
    this.lastActivity = null;
  }

  getTimeStats() {
    const totalSeconds = Math.floor(this.totalTime / 1000);
    const years = Math.floor(totalSeconds / (365 * 24 * 60 * 60));
    const months = Math.floor(
      (totalSeconds % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60)
    );
    const weeks = Math.floor(
      (totalSeconds % (30 * 24 * 60 * 60)) / (7 * 24 * 60 * 60)
    );
    const days = Math.floor(
      (totalSeconds % (7 * 24 * 60 * 60)) / (24 * 60 * 60)
    );
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    return { years, months, weeks, days, hours, minutes, seconds };
  }
}

class TimeStatsViewProvider {
  constructor(timeTracker) {
    this._timeTracker = timeTracker;
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren() {
    const projects = Array.from(this._timeTracker.projects.values());
    if (!projects.length) {
      return [];
    }

    return projects.map((project) => {
      const treeItem = new vscode.TreeItem(project.name);
      treeItem.contextValue = "project"; // Añadir el contextValue para el menú contextual
      treeItem.command = {
        command: "my-time.showProjectDetails",
        title: "Show Details",
        arguments: [project],
      };
      return treeItem;
    });
  }

  _formatTime(stats) {
    const parts = [];
    if (stats.years) parts.push(`${stats.years}y`);
    if (stats.months) parts.push(`${stats.months}m`);
    if (stats.weeks) parts.push(`${stats.weeks}w`);
    if (stats.days) parts.push(`${stats.days}d`);
    if (stats.hours) parts.push(`${stats.hours}h`);
    if (stats.minutes) parts.push(`${stats.minutes}m`);
    if (stats.seconds) parts.push(`${stats.seconds}s`);
    return parts.join(" ") || "0s";
  }
}

class TimeTracker {
  constructor(context) {
    this.context = context;
    this.projects = new Map();
    this._statsProvider = new TimeStatsViewProvider(this);

    context.subscriptions.push(
      vscode.window.registerTreeDataProvider("timeStats", this._statsProvider)
    );

    this.loadProjects();
    this.setupEventListeners();
    this.activeProject = null;

    setInterval(() => {
      this.saveProjects();
      this._statsProvider.refresh();
    }, 1000);
  }

  loadProjects() {
    const savedProjects = this.context.globalState.get("projects", {});
    Object.entries(savedProjects).forEach(([path, data]) => {
      const project = new Project(data.name, path);
      project.totalTime = data.totalTime;
      project.addedDate = data.addedDate || Date.now();
      this.projects.set(path, project);
    });
  }

  saveProjects() {
    const projectsData = {};
    this.projects.forEach((project, path) => {
      projectsData[path] = {
        name: project.name,
        totalTime: project.totalTime,
        addedDate: project.addedDate,
      };
    });
    this.context.globalState.update("projects", projectsData);
  }

  setupEventListeners() {
    const watcher = vscode.workspace.createFileSystemWatcher("**/*");
    watcher.onDidChange(() => this.handleActivity());
    watcher.onDidCreate(() => this.handleActivity());
    watcher.onDidDelete(() => this.handleActivity());

    vscode.workspace.onDidChangeTextDocument(() => this.handleActivity());
    vscode.window.onDidChangeActiveTextEditor(() => this.checkActiveProject());

    this.checkActiveProject();
  }

  handleActivity() {
    if (this.activeProject) {
      this.activeProject.updateActivity();
      this._statsProvider.refresh();
    }
  }

  checkActiveProject() {
    if (this.activeProject) {
      this.activeProject.deactivate();
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const currentPath = workspaceFolders[0].uri.fsPath;
    const project = this.projects.get(currentPath);

    if (project) {
      this.activeProject = project;
      project.updateActivity();
      this._statsProvider.refresh();
    }
  }

  async addProject() {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      title: "Select Project Folder",
    });

    if (!result || result.length === 0) return;

    const folderPath = result[0].fsPath;
    if (this.projects.has(folderPath)) {
      vscode.window.showInformationMessage("Project already exists");
      return;
    }

    const folderName = folderPath.split(/[\\/]/).pop();
    const project = new Project(folderName, folderPath);
    this.projects.set(folderPath, project);
    this.saveProjects();
    this._statsProvider.refresh();

    vscode.window.showInformationMessage(
      `Project "${folderName}" added successfully`
    );

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders[0].uri.fsPath === folderPath) {
      this.activeProject = project;
      project.updateActivity();
    }
  }

  showProjectDetails(project) {
    if (this._webviewPanel) {
      // Si ya hay un panel abierto, actualízalo
      this._webviewPanel.title = `Details: ${project.name}`;
      const stats = project.getTimeStats();
      this._webviewPanel.webview.html = this._getProjectDetailsHtml(
        project.name,
        stats
      );
    } else {
      // Si no hay un panel abierto, crea uno nuevo
      this._webviewPanel = vscode.window.createWebviewPanel(
        "projectDetails", // Identificador del panel
        `Details: ${project.name}`, // Título del panel
        vscode.ViewColumn.One, // Mostrar en la columna activa
        { enableScripts: true } // Permitir ejecución de JavaScript
      );

      const stats = project.getTimeStats();
      this._webviewPanel.webview.html = this._getProjectDetailsHtml(
        project.name,
        stats
      );

      // Cuando se cierre el panel, reinicia la referencia del panel
      this._webviewPanel.onDidDispose(() => {
        this._webviewPanel = null;
      });
    }
  }

  _getProjectDetailsHtml(projectName, stats, addedDate) {
    const currentDate = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const formattedAddedDate = new Date(addedDate).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Detalles del Proyecto</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background: #f4f7fc;
          }
          .container {
            width: 80%;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          header {
            text-align: center;
            margin-bottom: 30px;
          }
          header h1 {
            color: #2a3d66;
            font-size: 2.5rem;
          }
          .date {
            font-size: 1rem;
            color: #7a8b9c;
            margin-top: 5px;
          }
          .stats {
            margin-top: 30px;
          }
          .stat-row {
            display: flex;
            justify-content: space-between;
            gap: 15px;
          }
          .stat-card {
            background: #f0f4f8;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
            flex: 1;
            text-align: center;
          }
          .stat-card h3 {
            font-size: 1.2rem;
            color: #4c5d73;
          }
          .stat-card p {
            font-size: 1.4rem;
            color: #2a3d66;
            font-weight: bold;
          }
          .stat-card .label {
            font-size: 0.9rem;
            color: #7a8b9c;
          }
          .stat-row:last-child {
            margin-top: 20px;
          }
          footer {
            text-align: center;
            margin-top: 40px;
            color: #7a8b9c;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>Detalles del Proyecto: ${projectName}</h1>
            <div class="date">Última actualización: ${currentDate}</div>
          </header>
          
          <div class="stats">
            <div class="stat-row">
              <div class="stat-card">
                <h3>Años</h3>
                <p>${stats.years} años</p>
                <div class="label">Tiempo total acumulado</div>
              </div>
              <div class="stat-card">
                <h3>Meses</h3>
                <p>${stats.months} meses</p>
                <div class="label">Tiempo total acumulado</div>
              </div>
              <div class="stat-card">
                <h3>Semanas</h3>
                <p>${stats.weeks} semanas</p>
                <div class="label">Tiempo total acumulado</div>
              </div>
            </div>
  
            <div class="stat-row">
              <div class="stat-card">
                <h3>Horas</h3>
                <p>${stats.hours} horas</p>
                <div class="label">Tiempo total acumulado</div>
              </div>
              <div class="stat-card">
                <h3>Minutos</h3>
                <p>${stats.minutes} minutos</p>
                <div class="label">Tiempo total acumulado</div>
              </div>
              <div class="stat-card">
                <h3>Segundos</h3>
                <p>${stats.seconds} segundos</p>
                <div class="label">Tiempo total acumulado</div>
              </div>
            </div>
          </div>
          
          <footer>
            <p>Proyecto gestionado con <strong>TimeTracker</strong></p>
          </footer>
        </div>
      </body>
      </html>
    `;
  }

  deleteProject(path) {
    if (this.projects.has(path)) {
      this.projects.delete(path);
      this.saveProjects();
      this._statsProvider.refresh();
      vscode.window.showInformationMessage("Project deleted successfully");
    }
  }
}

function activate(context) {
  console.log("Time tracker extension is now active");

  const timeTracker = new TimeTracker(context);

  let addProjectCommand = vscode.commands.registerCommand(
    "my-time.addProject",
    () => timeTracker.addProject()
  );

  let showProjectDetailsCommand = vscode.commands.registerCommand(
    "my-time.showProjectDetails",
    (project) => timeTracker.showProjectDetails(project)
  );

  let deleteProjectCommand = vscode.commands.registerCommand(
    "my-time.deleteProject",
    (treeItem) => {
      const projectName = treeItem.label;
      const project = Array.from(timeTracker.projects.values()).find(
        (proj) => proj.name === projectName
      );

      if (project) {
        timeTracker.deleteProject(project.path);
      } else {
        vscode.window.showErrorMessage("Project not found.");
      }
    }
  );

  context.subscriptions.push(
    addProjectCommand,
    showProjectDetailsCommand,
    deleteProjectCommand
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
