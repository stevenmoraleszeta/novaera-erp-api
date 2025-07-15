const auditLogService = require('../services/auditLogService');

// Obtener todos los logs de auditoría
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await auditLogService.getAuditLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener logs de auditoría por record_id
exports.getAuditLogsByRecord = async (req, res) => {
  try {
    const { record_id } = req.params;
    const logs = await auditLogService.getAuditLogsByRecord(record_id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
