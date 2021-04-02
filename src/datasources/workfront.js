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
    ];
    this.taskFieldParams = [
      'projectID',
      'roleID',
      'role',
      'DE:Wun Standard | Estimate Task',
      'workRequired',
    ];
    this.hoursFieldParams = ['projectID', 'roleID', 'hours'];
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
      hours: async () => await this.getAllHoursByProjectID({ projID: proj.ID }),
    };
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

  hoursReducer(hours) {
    return {
      id: hours.ID,
      role: hours.name,
      roleID: hours.roleID,
      hoursLogged: Array.isArray(hours.hours)
        ? hours.hours.reduce((acc, cur) => acc + cur, 0)
        : hours.hours,
    };
  }

  async getAllProjects({ companyID }) {
    const res = await this.get(`proj/search`, {
      companyID: companyID,
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

  async getAllTasksByProjectID({ projID }) {
    const res = await this.get(`task/search`, {
      projectID: projID,
      fields: this.taskFieldParams,
      $$LIMIT: 2000,
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

  async getAllHoursByProjectID({ projID }) {
    const res = await this.get(`hour/search`, {
      projectID: projID,
      fields: this.hoursFieldParams,
      $$LIMIT: 2000,
    });
    const data = res.data;

    /**
     * Combines logged hours into an array of roles
     * with total hoursLogged for each role
     */
    const seen = new Map();

    const totalHoursLoggedByRole = data.filter((hours) => {
      let prev;

      if (seen.hasOwnProperty(hours.roleID)) {
        prev = seen[hours.roleID];
        prev.hours.push(hours.hours);

        return false;
      }

      if (!Array.isArray(hours.hours)) {
        hours.hours = [hours.hours];
      }

      seen[hours.roleID] = hours;

      return true;
    });

    return totalHoursLoggedByRole;
  }
}

module.exports = WorkfrontAPI;
