const graphql = require("graphql");
const fetch = require("node-fetch");

require("dotenv").config();

const {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLList,
  GraphQLString
} = graphql;

const BASE_URL = "http://localhost:4001";
// const BASE_URL = "https://wunderman.my.workfront.com/attask/api/v10.0";
// const API_KEY = process.env.WF_API_KEY;
// const COMPANY_ID = process.env.WF_COMPANY_ID;

const fetchRoleName = async id => {
  // /role/?ID=${id}&fields=name&apiKey=${API_KEY}
  const response = await fetch(`${BASE_URL}/roles?ID=${id}`);
  const json = await response.json();

  return json[0].name;
};

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
      resolve: async parent => {
        // /task/search?projectID=${parent.ID}&fields=projectID,roleID,DE:Wun%20Standard%20|%20Estimate%20Task,workRequired&$$LIMIT=2000&apiKey=${API_KEY}
        const response = await fetch(
          `${BASE_URL}/tasks?projectID=${parent.ID}`
        );
        const json = await response.json();

        /* Filters out tasks that do not have 
           DE:Wun Standard | Estimate Task : Yes */
        return json.filter(
          task =>
            task["DE:Wun Standard | Estimate Task"] &&
            task["DE:Wun Standard | Estimate Task"] === "Yes" &&
            task.roleID
        );
      }
    },
    hours: {
      type: new GraphQLList(HourType),
      resolve: async parent => {
        // /hour/search?projectID=${parent.ID}&fields=projectID,roleID,hours&$$LIMIT=2000&apiKey=${API_KEY}
        const response = await fetch(
          `${BASE_URL}/hours?projectID=${parent.ID}`
        );
        const json = await response.json();

        /* Combines logged hours into an array of roles 
           with total hoursLogged for each role */
        const seen = new Map();

        const totalHoursLoggedbyRole = json.filter(hour => {
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
        parent.roleID ? fetchRoleName(parent.roleID) : `*${parent.name}`
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
      resolve: json => json.workRequired / 60
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
      resolve: parent => fetchRoleName(parent.roleID)
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
        // /proj/${args.id}?fields=DE:Wun%20LA%20Program%20for%20Innocean%20HMA,DE:Wun%20LA%20Program%20for%20Innocean%20GMA,plannedCompletionDate&apiKey=${API_KEY}
        const response = await fetch(`${BASE_URL}/projects/${args.id}`);
        return response.json();
      }
    },
    projects: {
      type: new GraphQLList(ProjectType),
      resolve: async () => {
        // /proj/search?companyID=${COMPANY_ID}&status=CUR&plannedCompletionDate=$$TODAY&plannedCompletionDate_Mod=gte&fields=DE:Wun%20LA%20Program%20for%20Innocean%20HMA,DE:Wun%20LA%20Program%20for%20Innocean%20GMA,plannedCompletionDate&$$LIMIT=2000&apiKey=${API_KEY}
        const response = await fetch(`${BASE_URL}/projects/`);
        return response.json();
      }
    }
  }
});

module.exports = new GraphQLSchema({
  query: RootQuery
});
