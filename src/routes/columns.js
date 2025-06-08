const express = require('express');
const router = express.Router();
const columnsController = require('../controllers/columnsController');

router.get('/', columnsController.getColumns);
router.post('/', columnsController.createColumn);
router.get('/table/:table_id', columnsController.getColumnsByTable);
router.get('/:column_id', columnsController.getColumnById);
router.put('/:column_id', columnsController.updateColumn);
router.delete('/:column_id', columnsController.deleteColumn);
router.get('/table/:table_id/exists-name', columnsController.existsColumnNameInTable);
router.get('/:column_id/has-records', columnsController.columnHasRecords);

module.exports = router;