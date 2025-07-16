// Servicio para usuarios asignados a records
const pool = require('../config/db');

// Obtener usuarios asignados a un record
exports.getAssignedUsersByRecord = async (record_id) => {
  const result = await pool.query(
    `SELECT rau.user_id, u.name, u.email, u.avatar_url
     FROM record_assigned_users rau
     JOIN users u ON rau.user_id = u.id
     WHERE rau.record_id = $1`,
    [record_id]
  );
  return result.rows;
};

// Asignar usuarios a un record (sobrescribe los existentes)
exports.setAssignedUsersForRecord = async (record_id, user_ids = []) => {
  // Validar que record_id y user_ids sean válidos
  if (!record_id || !Array.isArray(user_ids)) {
    throw new Error('Parámetros inválidos');
  }
  // Elimina los usuarios actuales
  await pool.query('DELETE FROM record_assigned_users WHERE record_id = $1', [record_id]);
  // Inserta los nuevos (evitar duplicados)
  if (user_ids.length > 0) {
    const values = user_ids.map((uid, i) => `($1, $${i + 2})`).join(',');
    await pool.query(
      `INSERT INTO record_assigned_users (record_id, user_id) VALUES ${values}`,
      [record_id, ...user_ids]
    );
    // Notificar a cada usuario asignado
    
  }
  return true;
};

// Verificar si una tabla tiene usuarios asignados
exports.hasAssignedUsersInTable = async (table_id) => {
  const result = await pool.query(
    `SELECT COUNT(*) as count
     FROM record_assigned_users rau
     JOIN records r ON rau.record_id = r.id
     WHERE r.table_id = $1
     LIMIT 1`,
    [table_id]
  );
  return parseInt(result.rows[0].count) > 0;
};

// Obtener estadísticas de usuarios asignados por tabla
exports.getAssignedUsersStatsForTable = async (table_id) => {
  const result = await pool.query(
    `SELECT 
       COUNT(DISTINCT r.id) as total_records,
       COUNT(DISTINCT rau.record_id) as records_with_users,
       COUNT(DISTINCT rau.user_id) as total_users
     FROM records r
     LEFT JOIN record_assigned_users rau ON r.id = rau.record_id
     WHERE r.table_id = $1`,
    [table_id]
  );
  
  const stats = result.rows[0];
  return {
    totalRecords: parseInt(stats.total_records),
    recordsWithUsers: parseInt(stats.records_with_users),
    totalUsers: parseInt(stats.total_users)
  };
};
