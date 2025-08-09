const { getClient } = require('../utils/dbHelper');

// NOTE: The previous global interval scanning all schemas has been removed. For multi-tenant reminders
// a per-company scheduler should iterate company schemas and invoke processReminders(schema).

async function processReminders(schemaName) {
  const { client, release } = await getClient({ schemaName });
  try {
    const { rows } = await client.query('SELECT * FROM notifications WHERE reminder_at IS NOT NULL AND reminder_at <= NOW()');
    for (const notif of rows) {
      const { title, message, user_id, link_to_module, id } = notif;
      await client.query('SELECT crear_notificacion($1, $2, $3, $4, NULL) AS message', [user_id, title, message, link_to_module]);
      await client.query('UPDATE notifications SET reminder_at = NULL WHERE id = $1', [id]);
    }
  } finally { release(); }
}
exports.processReminders = processReminders;

exports.getNotifications = async (schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM notifications');
    return result.rows;
  } finally { release(); }
};

exports.createNotification = async ({ user_id, title, message, link_to_module, reminder }, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT crear_notificacion($1, $2, $3, $4, $5) AS message', [user_id, title, message, link_to_module, reminder]);
    return result.rows[0];
  } finally { release(); }
};

exports.updateNotification = async ({ user_id, title, message, link_to_module, reminder }, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT crear_notificacion($1, $2, $3, $4, $5) AS message', [user_id, title, message, link_to_module, reminder]);
    return result.rows[0];
  } finally { release(); }
};

exports.getNotificationsByUser = async (user_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM obtener_notificaciones_usuario($1)', [user_id]);
    return result.rows;
  } finally { release(); }
};

exports.markAsRead = async (user_id, notification_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT marcar_notificacion_leida($1, $2) AS message', [user_id, notification_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.markAllAsRead = async (user_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT marcar_todas_como_leidas($1) AS message', [user_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.deleteNotification = async (user_id, notification_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT eliminar_notificacion($1, $2) AS message', [user_id, notification_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.deleteAllNotifications = async (user_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT eliminar_todas_notificaciones($1) AS message', [user_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.deactivateGeneralNotification = async (id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    await client.query('UPDATE notifications SET is_active = false WHERE id = $1', [id]);
    return true;
  } finally { release(); }
};

exports.countUnread = async (user_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT contar_notificaciones_no_leidas($1) AS count', [user_id]);
    return result.rows[0].count;
  } finally { release(); }
};

exports.createMassiveNotifications = async (user_ids, title, message, link_to_module, reminder, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT crear_notificaciones_masivas($1, $2, $3, $4, $5) AS message', [user_ids, title, message, link_to_module, reminder]);
    return result.rows[0];
  } finally { release(); }
};