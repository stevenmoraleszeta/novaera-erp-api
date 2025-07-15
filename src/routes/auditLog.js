const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');

// GET /audit-log - todos los logs
router.get('/', auditLogController.getAuditLogs);

// GET /audit-log/record/:record_id - logs por registro
router.get('/record/:record_id', auditLogController.getAuditLogsByRecord);

module.exports = router;
