const express = require('express');
const router = express.Router();
const tableCollaboratorsController = require('../controllers/tableCollaboratorsController');
const authMiddleware = require('../middleware/authMiddleware');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

// Rutas para gestión de colaboradores de tablas

// GET /table-collaborators/table/:tableId - Obtener colaboradores de una tabla
router.get('/table/:tableId', tableCollaboratorsController.getTableCollaborators);

// GET /table-collaborators/user/:userId - Obtener colaboraciones de un usuario
router.get('/user/:userId', tableCollaboratorsController.getUserCollaborations);

// GET /table-collaborators/table/:tableId/available-users - Obtener usuarios disponibles
router.get('/table/:tableId/available-users', tableCollaboratorsController.getAvailableUsers);

// POST /table-collaborators/table/:tableId/assign - Asignar colaboradores a una tabla
router.post('/table/:tableId/assign', tableCollaboratorsController.assignCollaborators);

// DELETE /table-collaborators/table/:tableId/user/:userId - Remover colaborador
router.delete('/table/:tableId/user/:userId', tableCollaboratorsController.removeCollaborator);

module.exports = router;
