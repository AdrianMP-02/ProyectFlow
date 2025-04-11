const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');

router.get('/login', usuariosController.mostrarLogin);
router.get('/registro', usuariosController.mostrarRegistro);
router.post('/login', usuariosController.login);
router.post('/registro', usuariosController.register);
router.get('/logout', usuariosController.logout);

module.exports = router;
