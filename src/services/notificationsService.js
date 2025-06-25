const pool = require('../config/db');

    async function checkReminders() {
      try {
        console.log('Buscando recordatorios vencidos...');

        const { rows } = await pool.query(`
          SELECT * FROM notifications 
          WHERE reminder_at IS NOT NULL AND reminder_at <= NOW()
        `);

        for (const notif of rows) {
          const { title, message, user_id, link_to_module } = notif;

          // Insertar nueva notificación sin reminder
          await pool.query(
          'SELECT crear_notificacion($1, $2, $3, $4, NULL) AS message',
          [user_id, title, message, link_to_module]
          );

          // Quitar el reminder de la notificación original 
            await pool.query(`
            UPDATE notifications SET reminder_at = NULL WHERE id = $1
          `, [notif.id]);

          console.log(`🔁 Notificación ${notif.id} duplicada sin reminder.`);
        }
      } catch (error) {
        console.error(' Error al revisar recordatorios:', error);
      }
    }

    // Ejecutar la función cada 60 segundos
    setInterval(checkReminders, 60 * 1000);
    checkReminders();


  exports.getNotifications = async () => {
    const result = await pool.query('SELECT * FROM notifications');
    return result.rows;
  };

exports.createNotification = async ({ user_id, title, message, link_to_module, reminder }) => {
  const result = await pool.query(
    'SELECT crear_notificacion($1, $2, $3, $4, $5) AS message',
    [user_id, title, message, link_to_module, reminder]
  );
  return result.rows[0];
};

exports.updateNotification = async ({ user_id, title, message, link_to_module, reminder }) => {
  const result = await pool.query(
    'SELECT crear_notificacion($1, $2, $3, $4, $5) AS message',
    [user_id, title, message, link_to_module, reminder]
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

exports.createMassiveNotifications = async (user_ids, title, message, link_to_module, reminder) => {
  const result = await pool.query(
    'SELECT crear_notificaciones_masivas($1, $2, $3, $4, $5) AS message',
    [user_ids, title, message, link_to_module, reminder]
  );
  return result.rows[0];
};