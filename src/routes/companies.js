const express = require('express');
const router = express.Router();
const companiesController = require('../controllers/companiesController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas públicas (no requieren autenticación)

// Crear nueva empresa
router.post('/register', companiesController.createCompany);

// Validar código de empresa (para login)
router.post('/validate-code', companiesController.validateCompanyCode);

// Obtener información básica de empresa por código
router.get('/code/:code', companiesController.getCompanyByCode);

// Rutas protegidas (requieren autenticación)

// Obtener información de la empresa actual
router.get('/current', authMiddleware, companiesController.getCurrentCompany);

// Verificar límites de la empresa actual
router.get('/limits', authMiddleware, companiesController.checkLimits);

// Rutas de administración (requieren permisos especiales)

// Listar todas las empresas (solo super admin)
router.get('/all', authMiddleware, companiesController.getAllCompanies);

// Actualizar empresa
router.put('/:id', authMiddleware, companiesController.updateCompany);

// Eliminar empresa (soft delete)
router.delete('/:id', authMiddleware, companiesController.deleteCompany);

module.exports = router;
