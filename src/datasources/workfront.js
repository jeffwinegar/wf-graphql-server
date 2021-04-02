const { RESTDataSource } = require('apollo-datasource-rest');

class WorkfrontAPI extends RESTDataSource {
  constructor() {
    super();
    this.baseURL = 'https://wunderman.my.workfront.com/attask/api/v12.0/';
    this.projFieldParams = [
      'DE:Wun LA | Client / Portfolio',
      'DE:Wun LA Program for Innocean HMA',
      'DE:Wun LA Program for Innocean GMA',
      'plannedCompletionDate',
      'tasks',
      'hours',
    ];
    this.taskFieldParams = [
      'projectID',
      'roleID',
      'role',
      'DE:Wun Standard | Estimate Task',
      'workRequired',
    ];
  }

  willSendRequest(res) {
    res.params.set('apiKey', this.context.token);
  }

  projectReducer(proj) {
    return {
      id: proj.ID,
      name: proj.name,
      expireDate: proj.plannedCompletionDate,
      client: proj['DE:Wun LA | Client / Portfolio'],
      program: proj['DE:Wun LA Program for Innocean HMA']
        ? proj['DE:Wun LA Program for Innocean HMA']
        : proj['DE:Wun LA Program for Innocean GMA'] &&
          proj['DE:Wun LA Program for Innocean GMA'],
      tasks: async () => await this.getAllTasksByProjectID({ projID: proj.ID }),
      hours: '',
    };
  }

  // TODO: set companyID as a variable

  async getAllProjects() {
    const res = await this.get(`proj/search`, {
      companyID: this.context.companyID,
      status: 'CUR',
      plannedCompletionDate: '$$TODAY',
      plannedCompletionDate_Mod: 'gte',
      fields: this.projFieldParams,
      $$LIMIT: 2000,
    });
    const data = res.data;

    return Array.isArray(data)
      ? data.map((proj) => this.projectReducer(proj))
      : [];
  }

  async getProjectByID({ projID }) {
    const res = await this.get(`proj/${projID}`, {
      fields: this.projFieldParams,
    });
    const data = res.data;

    return this.projectReducer(data);
  }

  taskReducer(task) {
    return {
      id: task.ID,
      role: task.name,
      roleID: task.roleID,
      projectID: task.projectID,
      hoursScoped: task.workRequired ? task.workRequired / 60 : 0,
    };
  }

  async getAllTasksByProjectID({ projID }) {
    const res = await this.get(`task/search`, {
      projectID: projID,
      fields: this.taskFieldParams,
    });
    const data = res.data;

    const filteredData = data.filter((itm) => {
      if (!itm['DE:Wun Standard | Estimate Task']) {
        return;
      }
      if (!itm['DE:Wun Standard | Estimate Task'] === 'Yes') {
        return;
      }
      if (!itm.roleID) {
        return;
      }
      return itm;
    });

    return filteredData.map((itm) => this.taskReducer(itm));
  }
}

module.exports = WorkfrontAPI;
