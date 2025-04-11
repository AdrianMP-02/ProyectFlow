const express = require('express');
const router = express.Router();
const database = require('../../config/database');

// Endpoint para buscar usuarios que no están en el proyecto
router.get('/buscar', async (req, res) => {
  try {
    const { termino, proyecto_id } = req.query;

    if (!termino || termino.length < 2) {
      return res.json([]);
    }

    // Obtener el pool de conexiones
    const pool = await database.getPool();

    // Buscar usuarios que coincidan con el nombre o email y que NO estén ya en el proyecto
    const query = `
      SELECT id, nombre, email 
      FROM usuarios 
      WHERE (nombre LIKE ? OR email LIKE ?) 
      AND id NOT IN (
        SELECT usuario_id 
        FROM usuario_proyecto 
        WHERE proyecto_id = ?
      )
      LIMIT 10
    `;

    const [usuarios] = await pool.query(query,
      [`%${termino}%`, `%${termino}%`, proyecto_id]);

    res.json(usuarios);
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    res.status(500).json({ error: 'Error al buscar usuarios' });
  }
});

// Endpoint para añadir usuario a un proyecto
router.post('/agregar-a-proyecto', async (req, res) => {
  try {
    const { proyecto_id, usuario_id, rol } = req.body;

    // Validar rol
    if (rol !== 'admin' && rol !== 'usuario') {
      return res.status(400).json({
        success: false,
        error: 'Rol inválido'
      });
    }

    // Obtener el pool de conexiones
    const pool = await database.getPool();

    // Verificar si el usuario ya existe en el proyecto
    const [existeUsuario] = await pool.query(
      'SELECT * FROM usuario_proyecto WHERE usuario_id = ? AND proyecto_id = ?',
      [usuario_id, proyecto_id]
    );

    if (existeUsuario.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El usuario ya está asignado a este proyecto'
      });
    }

    // Añadir usuario al proyecto
    await pool.query(
      'INSERT INTO usuario_proyecto (usuario_id, proyecto_id, rol) VALUES (?, ?, ?)',
      [usuario_id, proyecto_id, rol]
    );

    // Obtener información del usuario para devolver en la respuesta
    const [usuarios] = await pool.query(
      'SELECT id, nombre, email FROM usuarios WHERE id = ?',
      [usuario_id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      mensaje: 'Usuario añadido con éxito',
      usuario: usuarios[0]
    });

  } catch (error) {
    console.error('Error al añadir usuario al proyecto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al añadir usuario al proyecto'
    });
  }
});

module.exports = router;