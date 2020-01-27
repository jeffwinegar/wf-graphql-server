const graphql = require("graphql");
const fetch = require("node-fetch");

require("dotenv").config();

const {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLList,
  GraphQLString
} = graphql;

// const DEV_BASE_URL = "http://localhost:4001";
const BASE_URL = "https://wunderman.my.workfront.com/attask/api/v10.0";
const API_KEY = process.env.WF_API_KEY;
const COMPANY_ID = process.env.WF_COMPANY_ID;

const ProjectType = new GraphQLObjectType({
  name: "Project",
  fields: () => ({
    id: {
      type: GraphQLString,
      resolve: json => json.ID
    },
    name: {
      type: GraphQLString,
      resolve: json => json.name
    },
    client: {
      type: GraphQLString,
      resolve: json => json["DE:Wun LA | Client / Portfolio"]
    },
    program: {
      type: GraphQLString,
      resolve: json =>
        json["DE:Wun LA Program for Innocean HMA"]
          ? json["DE:Wun LA Program for Innocean HMA"]
          : json["DE:Wun LA Program for Innocean GMA"] &&
            json["DE:Wun LA Program for Innocean GMA"]
    },
    expireDate: {
      type: GraphQLString,
      resolve: json => json.plannedCompletionDate
    },
    tasks: {
      type: new GraphQLList(TaskType),
      resolve: (parent, __, context) => {
        const ids = parent.tasks.map(id => id.ID);

        return context.taskLoader.loadMany(ids);
      }
    },
    hours: {
      type: new GraphQLList(HourType),
      resolve: (parent, __, context) => {
        const ids = parent.hours.map(id => id.ID);

        return context.hoursLoader.loadMany(ids);
      }
    }
  })
});

const TaskType = new GraphQLObjectType({
  name: "Task",
  fields: () => ({
    id: {
      type: GraphQLString,
      resolve: json => json.ID
    },
    role: {
      type: GraphQLString,
      resolve: parent =>
        !!parent.role || !!parent.roleID ? parent.role.name : `**${parent.name}`
    },
    projectID: {
      type: GraphQLString,
      resolve: json => json.projectID
    },
    roleID: {
      type: GraphQLString,
      resolve: json => json.roleID
    },
    hoursScoped: {
      type: GraphQLString,
      resolve: json => (json.workRequired ? json.workRequired / 60 : 0)
    }
  })
});

const HourType = new GraphQLObjectType({
  name: "Hour",
  fields: () => ({
    id: {
      type: GraphQLString,
      resolve: json => json.ID
    },
    role: {
      type: GraphQLString,
      resolve: parent => parent.role.name
    },
    roleID: {
      type: GraphQLString,
      resolve: json => json.roleID
    },
    hoursLogged: {
      type: GraphQLString,
      resolve: json =>
        Array.isArray(json.hours)
          ? json.hours.reduce((acc, cur) => acc + cur, 0)
          : json.hours
    }
  })
});

const RootQuery = new GraphQLObjectType({
  name: "RootQueryType",
  fields: {
    project: {
      type: ProjectType,
      args: { id: { type: GraphQLString } },
      resolve: async (_, args) => {
        // /projects/${args.id}
        try {
          const response = await fetch(
            `${BASE_URL}/proj/${args.id}?fields=DE:Wun%20LA%20|%20Client%20/%20Portfolio,DE:Wun%20LA%20Program%20for%20Innocean%20HMA,DE:Wun%20LA%20Program%20for%20Innocean%20GMA,plannedCompletionDate,tasks,hours&apiKey=${API_KEY}`
          );
          const json = await response.json();

          return json.data;
        } catch (err) {
          console.log(err);
        }
      }
    },
    projects: {
      type: new GraphQLList(ProjectType),
      resolve: async () => {
        // /projects/
        try {
          const response = await fetch(
            `${BASE_URL}/proj/search?companyID=${COMPANY_ID}&status=CUR&plannedCompletionDate=$$TODAY&plannedCompletionDate_Mod=gte&fields=DE:Wun%20LA%20|%20Client%20/%20Portfolio,DE:Wun%20LA%20Program%20for%20Innocean%20HMA,DE:Wun%20LA%20Program%20for%20Innocean%20GMA,plannedCompletionDate,tasks,hours&$$LIMIT=2000&apiKey=${API_KEY}`
          );
          const json = await response.json();

          return json.data;
        } catch (err) {
          console.log(err);
        }
      }
    }
  }
});

module.exports = new GraphQLSchema({
  query: RootQuery
});
