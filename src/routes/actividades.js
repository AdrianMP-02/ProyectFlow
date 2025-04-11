const express = require('express');
const router = express.Router();
const actividadesController = require('../controllers/actividadesController');

router.get('/:tareaId', actividadesController.obtenerActividades);
router.post('/', actividadesController.agregarActividad);

module.exports = router;