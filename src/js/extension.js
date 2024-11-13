const vscode = require("vscode");
const TimeTracker = require("./TimeTracker");

/**
 * Activates the extension and registers the necessary commands.
 *
 * This function is called when the extension is activated in Visual Studio Code.
 * It initializes the TimeTracker instance and registers commands for managing projects.
 * These commands allow users to add, view details, and delete projects for time tracking.
 *
 * @param {vscode.ExtensionContext} context - The context for the extension, used to manage subscriptions and state.
 */
function activate(context) {
  console.log("Time tracker extension is now active");

  // Create an instance of TimeTracker to manage time tracking functionality.
  const timeTracker = new TimeTracker(context);

  // Register the 'addProject' command that triggers adding a new project to the tracker.
  let addProjectCommand = vscode.commands.registerCommand(
    "my-time.addProject",
    () => timeTracker.addProject()
  );

  // Register the 'showProjectDetails' command to view details of a specific project.
  let showProjectDetailsCommand = vscode.commands.registerCommand(
    "my-time.showProjectDetails",
    (project) => timeTracker.showProjectDetails(project)
  );

  // Register the 'deleteProject' command to delete a selected project from the tracker.
  let deleteProjectCommand = vscode.commands.registerCommand(
    "my-time.deleteProject",
    (treeItem) => {
      // Extract project name from the tree item and find the corresponding project.
      const projectName = treeItem.label;
      const project = Array.from(timeTracker.projects.values()).find(
        (proj) => proj.name === projectName
      );
      // If the project is found, delete it, otherwise show an error message.
      if (project) {
        timeTracker.deleteProject(project.path);
      } else {
        vscode.window.showErrorMessage("Project not found.");
      }
    }
  );

  // Add the commands to the subscriptions to ensure they are disposed of when the extension is deactivated.
  context.subscriptions.push(
    addProjectCommand,
    showProjectDetailsCommand,
    deleteProjectCommand
  );
}

/**
 * Deactivates the extension.
 *
 * This function is called when the extension is deactivated in Visual Studio Code.
 * It's empty here because no specific deactivation logic is required for this extension.
 */
function deactivate() {}

module.exports = { activate, deactivate };
