const { gql } = require('apollo-server');

const typeDefs = gql`
  type Query {
    projects(cid: ID!): [Project!]!
    project(id: ID!): Project
  }

  type Project {
    id: ID!
    name: String!
    client: String!
    program: String!
    expireDate: String!
    tasks: [Task!]!
    hours: [Hours!]!
  }

  type Task {
    id: ID!
    role: String!
    roleID: String
    projectID: String!
    hoursScoped: Int!
  }

  type Hours {
    id: ID!
    role: String!
    roleID: String
    hoursLogged: Int!
  }
`;

module.exports = typeDefs;
