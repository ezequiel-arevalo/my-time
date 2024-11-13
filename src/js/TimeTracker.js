const vscode = require("vscode");
const Project = require("./project");
const TimeStatsViewProvider = require("./TimeStatsViewProvider");

/**
 * Class TimeTracker for managing project time tracking and statistics.
 *
 * This class manages the projects and their associated time tracking. It also provides methods to add, delete,
 * and update project activity, as well as save and load project data to and from Visual Studio Code's global state.
 */
class TimeTracker {
  /**
   * Creates an instance of TimeTracker.
   *
   * @param {Object} context - The VSCode extension context that provides access to global state and subscriptions.
   */
  constructor(context) {
    this.context = context; // The context of the VSCode extension
    this.projects = new Map(); // Map to hold all projects
    this._statsProvider = new TimeStatsViewProvider(this); // View provider for project stats

    // Register the tree view provider
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider("timeStats", this._statsProvider)
    );

    this.loadProjects(); // Load existing projects from global state
    this.setupEventListeners(); // Set up event listeners to track activity
    this.activeProject = null; // The currently active project

    // Save projects and refresh the stats view every second
    setInterval(() => {
      this.saveProjects();
      this._statsProvider.refresh();
    }, 1000);
  }

  /**
   * Loads the saved projects from the global state.
   */
  loadProjects() {
    const savedProjects = this.context.globalState.get("projects", {});
    Object.entries(savedProjects).forEach(([path, data]) => {
      const project = new Project(data.name, path);
      project.totalTime = data.totalTime;
      project.addedDate = data.addedDate || Date.now();
      this.projects.set(path, project);
    });
  }

  /**
   * Saves the current projects to the global state.
   */
  saveProjects() {
    const projectsData = {};
    this.projects.forEach((project, path) => {
      projectsData[path] = {
        name: project.name,
        totalTime: project.totalTime,
        addedDate: project.addedDate,
      };
    });
    this.context.globalState.update("projects", projectsData); // Store projects in global state
  }

  /**
   * Sets up event listeners to track file system changes and activity.
   */
  setupEventListeners() {
    const watcher = vscode.workspace.createFileSystemWatcher("**/*");
    watcher.onDidChange(() => this.handleActivity());
    watcher.onDidCreate(() => this.handleActivity());
    watcher.onDidDelete(() => this.handleActivity());

    vscode.workspace.onDidChangeTextDocument(() => this.handleActivity());
    vscode.window.onDidChangeActiveTextEditor(() => this.checkActiveProject());

    this.checkActiveProject(); // Check for the active project when initializing
  }

  /**
   * Handles project activity updates when files or documents change.
   */
  handleActivity() {
    if (this.activeProject) {
      this.activeProject.updateActivity();
      this._statsProvider.refresh();
    }
  }

  /**
   * Checks and updates the active project based on the current workspace.
   */
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

  /**
   * Adds a new project to the tracker by selecting a folder.
   */
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

  /**
   * Shows the details of a specific project in a webview panel.
   *
   * @param {Project} project - The project whose details should be displayed.
   */
  showProjectDetails(project) {
    const panel = vscode.window.createWebviewPanel(
      "projectDetails",
      `Project Details - ${project.name}`,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    const stats = project.getTimeStats();
    const htmlContent = this._getProjectDetailsHtml(
      project.name,
      stats,
      project.addedDate
    );

    panel.webview.html = htmlContent;
  }

  /**
   * Deletes a project from the tracker.
   *
   * @param {string} path - The path of the project to be deleted.
   */
  deleteProject(path) {
    if (this.projects.has(path)) {
      this.projects.delete(path);
      this.saveProjects();
      this._statsProvider.refresh();
      vscode.window.showInformationMessage("Project deleted successfully");
    }
  }

  /**
   * Generates the HTML content for the project details page.
   *
   * @param {string} projectName - The name of the project.
   * @param {Object} stats - The time statistics for the project.
   * @param {number} addedDate - The date when the project was added.
   * @returns {string} The HTML content for displaying project details.
   */
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
    ;`;
  }
}

module.exports = TimeTracker;
