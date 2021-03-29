const { ApolloServer, gql } = require('apollo-server');
const fetch = require('node-fetch');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, './.env') });

const BASE_URL = 'https://wunderman.my.workfront.com/attask/api/v12.0';
const API_KEY = process.env.WF_API_KEY;
// const COMPANY_ID = process.env.WF_COMPANY_ID;

const typeDefs = gql`
  type Query {
    getProject(id: ID!): Project
  }

  type Project {
    id: ID!
    name: String!
    client: String!
    program: String!
    expireDate: String!
    tasks: [Task!]!
    hours: [Hour]
  }

  type Task {
    id: ID!
    role: String!
    roleID: String
    projectID: String!
    hoursScoped: Int!
  }

  type Hour {
    id: ID!
    role: String!
    roleID: String
    hoursLogged: Int!
  }
`;

const resolvers = {
  Project: {
    id: (parent) => parent.ID,
    client: (parent) => parent['DE:Wun LA | Client / Portfolio'],
    program: (parent) =>
      parent['DE:Wun LA Program for Innocean HMA']
        ? parent['DE:Wun LA Program for Innocean HMA']
        : parent['DE:Wun LA Program for Innocean GMA'] &&
          parent['DE:Wun LA Program for Innocean GMA'],
    expireDate: (parent) => parent.plannedCompletionDate,
    tasks: async (parent) => {
      const promises = parent.tasks.map(async (task) => {
        const id = task.ID;
        const res = await fetch(
          `${BASE_URL}/task/${id}?fields=projectID,roleID,role,DE:Wun+Standard+%7C+Estimate+Task,workRequired&apiKey=${API_KEY}`
        );
        const json = await res.json();
        const data = json.data;

        if (!data['DE:Wun Standard | Estimate Task']) {
          return;
        }
        if (!data['DE:Wun Standard | Estimate Task'] === 'Yes') {
          return;
        }
        if (!data.roleID) {
          return;
        }

        return data;
      });

      return Promise.all(promises).then((tasks) =>
        tasks.filter((task) => task != null)
      );
    },
  },
  Task: {
    id: (parent) => parent.ID,
    role: (parent) => parent.name,
    hoursScoped: (parent) =>
      parent.workRequired ? parent.workRequired / 60 : 0,
  },
  Query: {
    getProject: async (_, { id }) => {
      const res = await fetch(
        `${BASE_URL}/proj/${id}?fields=DE:Wun+LA+|+Client+/+Portfolio,DE:Wun+LA+Program+for+Innocean+HMA,DE:Wun+LA+Program+for+Innocean+GMA,plannedCompletionDate,tasks,hours&apiKey=${API_KEY}`
      );
      const json = await res.json();

      return json.data;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: (req, res) => ({ req, res }),
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
