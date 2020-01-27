const express = require("express");
const graphqlHTTP = require("express-graphql");
const cors = require("cors");
const schema = require("./schema/schema");

const fetch = require("node-fetch");
const DataLoader = require("dataloader");

require("dotenv").config();

const BASE_URL = "https://wunderman.my.workfront.com/attask/api/v10.0";
const API_KEY = process.env.WF_API_KEY;

const fetchTask = async id => {
  try {
    const response = await fetch(
      `${BASE_URL}/task/${id}?fields=projectID,roleID,role,DE:Wun%20Standard%20|%20Estimate%20Task,workRequired&$$LIMIT=2000&apiKey=${API_KEY}`
    );
    const json = await response.json();
    const task = json.data;

    /* Filters out tasks that do not have 
       DE:Wun Standard | Estimate Task : Yes and do not have a roleID */
    return (
      task["DE:Wun Standard | Estimate Task"] &&
      task["DE:Wun Standard | Estimate Task"] === "Yes" &&
      task.roleID &&
      task
    );
  } catch (err) {
    console.log(err);
  }
};

const fetchHours = async id => {
  try {
    const response = await fetch(
      `${BASE_URL}/hour/${id}?fields=projectID,roleID,hours&$$LIMIT=2000&apiKey=${API_KEY}`
    );
    const json = await response.json();

    /* Combines logged hours into an array of roles 
       with total hoursLogged for each role */
    const seen = new Map();

    const totalHoursLoggedbyRole = json.data.filter(hour => {
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

// const corsWhitelist = ["http://localhost:2045", "http://127.0.0.1:2045"];

// const corsOptions = {
//   origin: function(origin, callback) {
//     if (corsWhitelist.indexOf(origin) === -1) {
//       const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
//       return callback(new Error(msg), false);
//     }
//     return callback(null, true);
//   },
//   methods: "GET",
//   optionSuccessStatus: 200
// };
const corsOptions = {
  origin: "*",
  methods: "GET",
  optionSuccessStatus: 200
};

const PORT = process.env.PORT || 2045;

const app = express();

app.use(cors(corsOptions));

app.use(
  "/graphql",
  graphqlHTTP(req => {
    const taskLoader = new DataLoader(keys => Promise.all(keys.map(fetchTask)));

    const hoursLoader = new DataLoader(keys =>
      Promise.all(keys.map(fetchHours))
    );

    return {
      schema,
      context: {
        taskLoader,
        hoursLoader
      },
      graphiql: true
    };
  })
);

app.set("PORT", PORT);

app.listen(app.get("PORT"), () => {
  console.log(
    `Express started on http://localhost:${app.get(
      "PORT"
    )} press Ctrl-C to terminate.`
  );
});
