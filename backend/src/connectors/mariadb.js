module.exports = {
  type: 'mariadb',
  defaultInterval: 30,

  async fetch(app, credential) {
    const mysql = require('mysql2/promise');

    const host = credential?.host || new URL(app.url).hostname;
    const port = parseInt(credential?.port) || 3306;

    const connection = await mysql.createConnection({
      host,
      port,
      user: credential?.username || 'root',
      password: credential?.password || '',
      connectTimeout: 10000,
    });

    try {
      const [statusRows] = await connection.execute('SHOW GLOBAL STATUS');
      const [variableRows] = await connection.execute('SHOW GLOBAL VARIABLES');
      const [dbRows] = await connection.execute('SHOW DATABASES');
      const [tableCount] = await connection.execute(
        'SELECT COUNT(*) as c FROM information_schema.tables'
      );

      // Convert arrays to maps for easy lookup
      const status = {};
      for (const row of statusRows) {
        status[row.Variable_name] = row.Value;
      }

      const variables = {};
      for (const row of variableRows) {
        variables[row.Variable_name] = row.Value;
      }

      const uptime = parseInt(status.Uptime) || 0;
      const questions = parseInt(status.Questions) || 0;
      const queriesPerSec = uptime > 0 ? parseFloat((questions / uptime).toFixed(2)) : 0;

      const connections = parseInt(status.Threads_connected) || 0;
      const maxConnections = parseInt(variables.max_connections) || 0;

      const bufferPoolSize = parseInt(variables.innodb_buffer_pool_size) || 0;
      const bufferPoolGB = parseFloat((bufferPoolSize / (1024 ** 3)).toFixed(2));

      const version = variables.version || null;

      return {
        status: 'online',
        version,
        connections,
        max_connections: maxConnections,
        queries_per_sec: queriesPerSec,
        uptime_seconds: uptime,
        tables: tableCount[0]?.c || 0,
        databases: dbRows.length,
        buffer_pool_gb: bufferPoolGB,
      };
    } finally {
      await connection.end();
    }
  },

  historyKeys: ['connections', 'queries_per_sec'],
};
