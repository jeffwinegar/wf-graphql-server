const fetch = require("node-fetch");

require("dotenv").config();

const BASE_URL = "https://wunderman.my.workfront.com/attask/api/v10.0";
const API_KEY = process.env.WF_API_KEY;

const fetchTask = async (id) => {
  try {
    const response = await fetch(
      `${BASE_URL}/task/${id}?fields=projectID,roleID,role,DE:Wun%20Standard%20|%20Estimate%20Task,workRequired&$$LIMIT=2000&apiKey=${API_KEY}`
    );
    const json = await response.json();
    const task = json.data;

    /* Filters out tasks that do not have 
       DE:Wun Standard | Estimate Task : Yes and do not have a roleID */
    return (
      typeof task !== undefined &&
      task["DE:Wun Standard | Estimate Task"] &&
      task["DE:Wun Standard | Estimate Task"] === "Yes" &&
      task.roleID &&
      task
    );
  } catch (err) {
    console.log(err);
  }
};

const fetchHours = async (id) => {
  try {
    const response = await fetch(
      `${BASE_URL}/hour/${id}?fields=projectID,roleID,hours&$$LIMIT=2000&apiKey=${API_KEY}`
    );
    const json = await response.json();

    /* Combines logged hours into an array of roles 
       with total hoursLogged for each role */
    const seen = new Map();

    const totalHoursLoggedbyRole = json.data.filter((hour) => {
      let prev;

      if (seen.hasOwnProperty(hour.roleID)) {
        prev = seen[hour.roleID];
        prev.hours.push(hour.hours);

        return false;
      }

      if (!Array.isArray(hour.hours)) {
        hour.hours = [hour.hours];
      }

      seen[hour.roleID] = hour;

      return true;
    });

    return totalHoursLoggedbyRole;
  } catch (err) {
    console.log(err);
  }
};

module.exports = {
  fetchTask,
  fetchHours,
};
