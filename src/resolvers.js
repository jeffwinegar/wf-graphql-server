module.exports = {
  Query: {
    projects: async (_, { cid }, { dataSources }) =>
      dataSources.workfrontAPI.getAllProjects({ companyID: cid }),
    project: async (_, { id }, { dataSources }) =>
      dataSources.workfrontAPI.getProjectByID({ projID: id }),
  },
};
