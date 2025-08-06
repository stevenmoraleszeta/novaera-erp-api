const express = require('express');
const router = express.Router();
const recordsController = require('../controllers/recordsController');

router.post('/', recordsController.createRecord);
router.get('/table/:table_id', recordsController.getRecordsByTable);
router.get('/:record_id', recordsController.getRecordById);
router.put('/:record_id', recordsController.updateRecord);
router.delete('/:record_id', recordsController.deleteRecord);
router.get('/table/:table_id/search', recordsController.searchRecordsByValue);
router.get('/table/:table_id/count', recordsController.countRecordsByTable);
router.get('/table/:table_id/exists-field', recordsController.existsFieldInRecords);
router.patch('/:record_id/update_records', recordsController.updateRecordPosition);
router.put('/update-original-ids/:tableId', recordsController.updateOriginalRecordIds);
router.delete('/delete-by-original-id/:tableId',recordsController.deleteByOriginalRecordId);
module.exports = router;