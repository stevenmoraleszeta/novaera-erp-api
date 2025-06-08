const pool = require('../config/db');

exports.getNotifications = async () => {
  const result = await pool.query('SELECT * FROM notifications');
  return result.rows;
};

exports.createNotification = async ({ user_id, title, message, link_to_module }) => {
  const result = await pool.query(
    'SELECT crear_notificacion($1, $2, $3, $4) AS message',
    [user_id, title, message, link_to_module]
  );
  return result.rows[0];
};

exports.getNotificationsByUser = async (user_id) => {
  const result = await pool.query(
    'SELECT * FROM obtener_notificaciones_usuario($1)',
    [user_id]
  );
  return result.rows;
};

exports.markAsRead = async (user_id, notification_id) => {
  const result = await pool.query(
    'SELECT marcar_notificacion_leida($1, $2) AS message',
    [user_id, notification_id]
  );
  return result.rows[0];
};

exports.markAllAsRead = async (user_id) => {
  const result = await pool.query(
    'SELECT marcar_todas_como_leidas($1) AS message',
    [user_id]
  );
  return result.rows[0];
};

exports.deleteNotification = async (user_id, notification_id) => {
  const result = await pool.query(
    'SELECT eliminar_notificacion($1, $2) AS message',
    [user_id, notification_id]
  );
  return result.rows[0];
};

exports.deleteAllNotifications = async (user_id) => {
  const result = await pool.query(
    'SELECT eliminar_todas_notificaciones($1) AS message',
    [user_id]
  );
  return result.rows[0];
};

exports.countUnread = async (user_id) => {
  const result = await pool.query(
    'SELECT contar_notificaciones_no_leidas($1) AS count',
    [user_id]
  );
  return result.rows[0].count;
};

exports.createMassiveNotifications = async (user_ids, title, message, link_to_module) => {
  const result = await pool.query(
    'SELECT crear_notificaciones_masivas($1, $2, $3, $4) AS message',
    [user_ids, title, message, link_to_module]
  );
  return result.rows[0];
};