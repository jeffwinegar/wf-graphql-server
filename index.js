const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const cors = require("cors");
const schema = require("./schema/schema");

const { fetchTask, fetchHours } = require("./fetchData");

const DataLoader = require("dataloader");

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
  optionSuccessStatus: 200,
};

const PORT = process.env.PORT || 2045;

const app = express();

app.use(cors(corsOptions));

app.use(
  "/graphql",
  graphqlHTTP((req) => {
    const taskLoader = new DataLoader((keys) =>
      Promise.all(keys.map(fetchTask))
    );

    const hoursLoader = new DataLoader((keys) =>
      Promise.all(keys.map(fetchHours))
    );

    return {
      schema,
      context: {
        taskLoader,
        hoursLoader,
      },
      graphiql: true,
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
