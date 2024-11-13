/**
 * Class Project to manage the state and time statistics of a project.
 *
 * This class represents a project and provides methods for tracking its activity, calculating accumulated time, and formatting time statistics.
 * Each project has a name, path, total time spent on it, the last activity timestamp, and an active status.
 */
class Project {
  /**
   * Creates an instance of the Project class.
   *
   * @param {string} name - The name of the project.
   * @param {string} path - The path to the project folder.
   */
  constructor(name, path) {
    this.name = name; // Name of the project
    this.path = path; // Path to the project folder
    this.totalTime = 0; // Total accumulated time spent on the project (in milliseconds)
    this.lastActivity = null; // Timestamp of the last activity (when the user interacted)
    this.isActive = false; // Indicates if the project is currently being tracked
    this.addedDate = Date.now(); // Timestamp when the project was added
  }

  /**
   * Updates the activity of the project and increases the total accumulated time.
   *
   * This method is called when the project is actively being worked on. It calculates the time difference
   * since the last recorded activity and adds it to the project's total time if the time difference is less than 5 minutes.
   */
  updateActivity() {
    const now = Date.now();
    if (this.isActive && this.lastActivity) {
      const timeDiff = now - this.lastActivity;
      if (timeDiff < 5 * 60 * 1000) {
        this.totalTime += timeDiff; // Accumulate time if activity occurred within 5 minutes
      }
    }
    this.lastActivity = now;
    this.isActive = true;
  }

  /**
   * Deactivates the project by setting its active state to false.
   *
   * This method stops tracking the time for the project and resets the activity timestamp.
   */
  deactivate() {
    this.isActive = false;
    this.lastActivity = null; // Reset last activity timestamp when deactivating the project
  }

  /**
   * Returns the time statistics of the project in years, months, weeks, days, hours, minutes, and seconds.
   *
   * This method converts the total time spent on the project into a human-readable format and returns an object
   * with time breakdowns.
   *
   * @returns {Object} An object with the time breakdown:
   * - years: Total time in years
   * - months: Total time in months
   * - weeks: Total time in weeks
   * - days: Total time in days
   * - hours: Total time in hours
   * - minutes: Total time in minutes
   * - seconds: Total time in seconds
   */
  getTimeStats() {
    const totalSeconds = Math.floor(this.totalTime / 1000); // Convert total time to seconds
    return {
      years: Math.floor(totalSeconds / (365 * 24 * 60 * 60)),
      months: Math.floor(
        (totalSeconds % (365 * 24 * 60 * 60)) / (30 * 24 * 60 * 60)
      ),
      weeks: Math.floor(
        (totalSeconds % (30 * 24 * 60 * 60)) / (7 * 24 * 60 * 60)
      ),
      days: Math.floor((totalSeconds % (7 * 24 * 60 * 60)) / (24 * 60 * 60)),
      hours: Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60)),
      minutes: Math.floor((totalSeconds % (60 * 60)) / 60),
      seconds: totalSeconds % 60,
    };
  }
}

module.exports = Project;
