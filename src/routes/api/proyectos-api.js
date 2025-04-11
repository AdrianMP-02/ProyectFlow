const express = require('express');
const router = express.Router();
const db = require('../../config/database');

// Endpoint para añadir usuario a un proyecto
router.post('/anadir-usuario', async (req, res) => {
  try {
    const { proyecto_id, usuario_id, rol } = req.body;

    // Validar rol
    if (rol !== 'admin' && rol !== 'usuario') {
      return res.status(400).json({
        success: false,
        error: 'Rol inválido'
      });
    }

    // Verificar si el usuario ya existe en el proyecto
    const [existeUsuario] = await db.execute(
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
    await db.execute(
      'INSERT INTO usuario_proyecto (usuario_id, proyecto_id, rol) VALUES (?, ?, ?)',
      [usuario_id, proyecto_id, rol]
    );

    // Obtener información del usuario para devolver en la respuesta
    const [usuarios] = await db.execute(
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