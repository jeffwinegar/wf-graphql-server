module.exports = {
  Query: {
    projects: async (_, __, { dataSources }) =>
      dataSources.workfrontAPI.getAllProjects(),
    project: async (_, { id }, { dataSources }) =>
      dataSources.workfrontAPI.getProjectByID({ projID: id }),
  },
};
