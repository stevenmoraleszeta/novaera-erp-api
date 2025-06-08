const express = require('express');
const router = express.Router();
const tablesController = require('../controllers/tablesController');

router.post('/', tablesController.createTable);
router.get('/module/:module_id', tablesController.getTablesByModule);
router.get('/:table_id', tablesController.getTableById);
router.put('/:table_id', tablesController.updateTable);
router.delete('/:table_id', tablesController.deleteTable);
router.get('/exists/name', tablesController.existsTableNameInModule);

module.exports = router;