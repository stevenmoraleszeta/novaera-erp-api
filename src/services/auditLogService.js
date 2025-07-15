const pool = require('../config/db');

// Obtener todos los registros de audit_log
exports.getAuditLogs = async () => {
  const result = await pool.query('SELECT * FROM audit_log ORDER BY changed_at DESC');
  return result.rows;
};

// Obtener logs de auditoría por record_id, incluyendo nombre de usuario
exports.getAuditLogsByRecord = async (record_id) => {
  const result = await pool.query(`
    SELECT al.*, u.name as user_name, u.name as user_username, u.email as user_email
    FROM audit_log al
    LEFT JOIN users u ON al.changed_by = u.id
    WHERE al.record_id = $1
    ORDER BY al.changed_at DESC
  `, [record_id]);
  return result.rows;
};
