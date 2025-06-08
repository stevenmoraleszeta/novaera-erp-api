const express = require('express');
const router = express.Router();
const modulesController = require('../controllers/modulesController');

router.get('/', modulesController.getModules);
router.post('/', modulesController.createModule);
router.get('/:id', modulesController.getModuleById);
router.put('/:id', modulesController.updateModule);
router.delete('/:id', modulesController.deleteModule);
router.get('/exists/table-name', modulesController.existsTableNameInModule);

module.exports = router;