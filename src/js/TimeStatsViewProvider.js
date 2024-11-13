const vscode = require("vscode");

/**
 * Tree view provider for displaying project time statistics in a tree view.
 *
 * This class provides the functionality for displaying time statistics for multiple projects in Visual Studio Code's
 * tree view. It allows users to see a list of projects with the option to view detailed time information for each project.
 */
class TimeStatsViewProvider {
  /**
   * Creates an instance of the TimeStatsViewProvider class.
   *
   * @param {Object} timeTracker - The time tracker instance responsible for managing project time statistics.
   */
  constructor(timeTracker) {
    this._timeTracker = timeTracker; // The time tracker instance
    this._onDidChangeTreeData = new vscode.EventEmitter(); // Event emitter for refreshing the tree view
    this.onDidChangeTreeData = this._onDidChangeTreeData.event; // Expose event to subscribe for updates
  }

  /**
   * Refreshes the tree view by firing an event to update the data shown.
   *
   * This method triggers the event to update the tree view, making it re-fetch and render the current data of projects.
   */
  refresh() {
    this._onDidChangeTreeData.fire(); // Trigger the event to refresh the view
  }

  /**
   * Retrieves a tree item element.
   *
   * This method returns the tree item element, which represents a node in the tree view.
   *
   * @param {vscode.TreeItem} element - The tree item element to be displayed.
   * @returns {vscode.TreeItem} The tree item element.
   */
  getTreeItem(element) {
    return element; // Return the tree item to be displayed
  }

  /**
   * Retrieves the children (projects) for the tree view.
   *
   * This method maps each project in the time tracker to a tree item, which is then used to display the projects in the tree view.
   * Each project will be clickable and show its detailed time information.
   *
   * @returns {Array<vscode.TreeItem>} An array of tree item elements representing the projects.
   */
  getChildren() {
    return Array.from(this._timeTracker.projects.values()).map((project) => {
      const treeItem = new vscode.TreeItem(project.name); // Create a new tree item for each project
      treeItem.contextValue = "project"; // Set the context value for the item to "project"
      treeItem.command = {
        command: "my-time.showProjectDetails", // Command to show project details when clicked
        title: "Show Details",
        arguments: [project], // Pass the project as an argument to the command
      };
      return treeItem; // Return the created tree item
    });
  }

  /**
   * Formats the time statistics for display in the tree view.
   *
   * This method takes the time statistics (years, months, weeks, etc.) and formats them into a readable string
   * that can be shown in the tree view.
   *
   * @param {Object} stats - The time statistics object containing years, months, weeks, days, hours, minutes, and seconds.
   * @returns {string} The formatted time string, e.g., "1y 2m 3w 4d 5h 6m 7s".
   */
  _formatTime(stats) {
    const parts = []; // Array to hold time parts
    if (stats.years) parts.push(`${stats.years}y`); // Add years if present
    if (stats.months) parts.push(`${stats.months}m`); // Add months if present
    if (stats.weeks) parts.push(`${stats.weeks}w`); // Add weeks if present
    if (stats.days) parts.push(`${stats.days}d`); // Add days if present
    if (stats.hours) parts.push(`${stats.hours}h`); // Add hours if present
    if (stats.minutes) parts.push(`${stats.minutes}m`); // Add minutes if present
    if (stats.seconds) parts.push(`${stats.seconds}s`); // Add seconds if present
    return parts.join(" ") || "0s"; // Join all parts into a string, default to "0s" if no time is available
  }
}

module.exports = TimeStatsViewProvider;
