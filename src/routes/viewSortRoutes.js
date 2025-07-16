const express = require('express');
const router = express.Router();
const viewSortController = require('../controllers/viewSortController');

// Obtener todos los ordenamientos de una vista
router.get('/by-view/:view_id', viewSortController.getViewSortsByViewId);

// Crear un nuevo ordenamiento
router.post('/', viewSortController.createViewSort);

// Actualizar un ordenamiento (dirección o columna)
router.put('/:id', viewSortController.updateViewSort);

// Eliminar un ordenamiento
router.delete('/:id', viewSortController.deleteViewSort);

// Cambiar posición de ordenamiento
router.patch('/:id/update_position', viewSortController.updateViewSortPosition);

module.exports = router;
