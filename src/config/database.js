const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

const initializePool = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestor_proyectos',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Verificar conexión
    const connection = await pool.getConnection();
    console.log('✅ Conexión a la base de datos establecida correctamente');
    connection.release();
    return pool;
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error);
    process.exit(1);
  }
};

module.exports = {
  getPool: async () => {
    if (!pool) {
      await initializePool();
    }
    return pool;
  }
};
