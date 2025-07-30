
const pool = require('../config/db');

class ScheduledNotificationsService {
  
  // Crear una notificación programada
  async createScheduledNotification(data) {
    const { table_id, record_id, column_id, target_date, notification_title, 
            notification_message, notify_before_days, assigned_users, created_by } = data;
    
    // Validar que created_by esté presente
    if (!created_by) {
      throw new Error('created_by es requerido');
    }
    
    const query = `
      INSERT INTO scheduled_notifications (
        table_id, record_id, column_id, target_date, notification_title, 
        notification_message, notify_before_days, assigned_users, created_by, read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    // Convertir assigned_users a array de enteros
    const usersArray = Array.isArray(assigned_users) 
      ? assigned_users.map(id => parseInt(id)).filter(id => !isNaN(id))
      : [];
    
    const result = await pool.query(query, [
      table_id, record_id, column_id, target_date, notification_title,
      notification_message, notify_before_days || 0, usersArray, created_by, false
    ]);
    
    return result.rows[0];
  }

  // Obtener notificaciones programadas de un usuario
  async getUserScheduledNotifications(userId) {
    const query = `
      SELECT sn.*, t.name as table_name, t.module_id, c.name as column_name
      FROM scheduled_notifications sn
      LEFT JOIN tables t ON sn.table_id = t.id
      LEFT JOIN columns c ON sn.column_id = c.id
      WHERE sn.is_active = true 
        AND sn.read = false
        AND ($1 = ANY(sn.assigned_users) OR sn.created_by = $1)
      ORDER BY sn.target_date ASC
    `;
    
    const result = await pool.query(query, [parseInt(userId)]);
    return result.rows.map(row => ({
      ...row,
      assigned_users: row.assigned_users // Ya es un array de enteros
    }));
  }

  // Obtener notificaciones por tabla
  async getNotificationsByTable(tableId) {
    const query = `
      SELECT sn.*, t.name as table_name, t.module_id, c.name as column_name
      FROM scheduled_notifications sn
      LEFT JOIN tables t ON sn.table_id = t.id
      LEFT JOIN columns c ON sn.column_id = c.id
      WHERE sn.table_id = $1 AND sn.is_active = true
      ORDER BY sn.target_date ASC
    `;
    
    const result = await pool.query(query, [tableId]);
    return result.rows.map(row => ({
      ...row,
      assigned_users: row.assigned_users // Ya es un array de enteros
    }));
  }

    async deactivateScheduledNotification(id) {
      const query = `
        UPDATE scheduled_notifications 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await pool.query(query, [id]);
      return true;
    }
  // Obtener notificaciones por registro específico
  async getNotificationsByRecord(tableId, recordId) {
    const query = `
      SELECT sn.*, t.name as table_name, t.module_id, c.name as column_name
      FROM scheduled_notifications sn
      LEFT JOIN tables t ON sn.table_id = t.id
      LEFT JOIN columns c ON sn.column_id = c.id
      WHERE sn.table_id = $1 AND sn.record_id = $2 AND sn.is_active = true
      ORDER BY sn.target_date ASC
    `;
    
    const result = await pool.query(query, [tableId, recordId]);
    return result.rows.map(row => ({
      ...row,
      assigned_users: row.assigned_users // Ya es un array de enteros
    }));
  }

  // Obtener columnas de tipo fecha/datetime de una tabla
  async getDateColumns(tableId) {
    const query = `
      SELECT id, name, data_type, is_nullable
      FROM columns
      WHERE table_id = $1 
        AND data_type IN ('date', 'datetime', 'timestamp')
        AND is_active = true
      ORDER BY position
    `;
    
    const result = await pool.query(query, [tableId]);
    return result.rows;
  }

  // Actualizar notificación programada
  async updateScheduledNotification(id, data) {
    const { target_date, notification_title, notification_message, 
            notify_before_days, assigned_users } = data;
    
    const query = `
      UPDATE scheduled_notifications 
      SET target_date = $2, notification_title = $3, notification_message = $4, 
          notify_before_days = $5, assigned_users = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;
    
    // Convertir assigned_users a array de enteros
    const usersArray = Array.isArray(assigned_users) 
      ? assigned_users.map(id => parseInt(id)).filter(id => !isNaN(id))
      : [];
    
    const result = await pool.query(query, [
      id, target_date, notification_title, notification_message, 
      notify_before_days || 0, usersArray
    ]);
    
    return result.rows[0];
  }

  async deactivateAllNotifications() {
    // Desactivar todas las scheduled
    await pool.query(`UPDATE scheduled_notifications SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE is_active = true`);
    // Desactivar todas las generales (si tienen is_active)
    try {
      await pool.query(`UPDATE notifications SET is_active = false WHERE is_active = true`);
    } catch (e) {
      // Si la tabla notifications no tiene is_active, ignorar
    }
    return true;
  }
  // Eliminar notificación programada (soft delete)
  async deleteScheduledNotification(id) {
    const query = `
      UPDATE scheduled_notifications 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await pool.query(query, [id]);
    return true;
  }

  // Obtener estadísticas generales
  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_scheduled,
        COUNT(CASE WHEN notification_sent = false THEN 1 END) as pending_scheduled,
        COUNT(CASE WHEN notification_sent = true THEN 1 END) as sent_scheduled,
        COUNT(CASE WHEN DATE(target_date) = CURRENT_DATE THEN 1 END) as today_scheduled
      FROM scheduled_notifications
      WHERE is_active = true
    `;
    
    const result = await pool.query(query);
    return {
      scheduled: {
        total: parseInt(result.rows[0].total_scheduled) || 0,
        pending: parseInt(result.rows[0].pending_scheduled) || 0,
        sent: parseInt(result.rows[0].sent_scheduled) || 0,
        today: parseInt(result.rows[0].today_scheduled) || 0
      }
    };
  }

  // Suscribirse a cambios en un registro
  async subscribeToRecord(data) {
    const { user_id, table_id, record_id, notification_types, created_by } = data;
    
    const query = `
      INSERT INTO record_subscriptions (user_id, table_id, record_id, notification_types, created_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, table_id, COALESCE(record_id, 0))
      DO UPDATE SET 
        notification_types = $4,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      user_id, table_id, record_id, JSON.stringify(notification_types || ['UPDATE']), created_by
    ]);
    
    return result.rows[0];
  }

  // Obtener suscripciones de un usuario
  async getUserSubscriptions(userId) {
    const query = `
      SELECT rs.*, t.name as table_name
      FROM record_subscriptions rs
      LEFT JOIN tables t ON rs.table_id = t.id
      WHERE rs.user_id = $1 AND rs.is_active = true
      ORDER BY rs.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows.map(row => ({
      ...row,
      notification_types: JSON.parse(row.notification_types || '[]')
    }));
  }

  // Verificar si un usuario está suscrito
  async checkSubscription(userId, tableId, recordId) {
    const query = `
      SELECT COUNT(*) as count
      FROM record_subscriptions
      WHERE user_id = $1 AND table_id = $2 
        AND (record_id = $3 OR record_id IS NULL)
        AND is_active = true
    `;
    
    const result = await pool.query(query, [userId, tableId, recordId]);
    return parseInt(result.rows[0].count) > 0;
  }

  // Eliminar suscripción
  async deleteSubscription(id) {
    const query = `
      UPDATE record_subscriptions 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await pool.query(query, [id]);
    return true;
  }

  // Obtener estadísticas de suscripciones
  async getSubscriptionStats() {
    const query = `
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN record_id IS NOT NULL THEN 1 END) as record_subscriptions,
        COUNT(CASE WHEN record_id IS NULL THEN 1 END) as table_subscriptions
      FROM record_subscriptions
      WHERE is_active = true
    `;
    
    const result = await pool.query(query);
    return {
      subscriptions: {
        total: parseInt(result.rows[0].total_subscriptions) || 0,
        records: parseInt(result.rows[0].record_subscriptions) || 0,
        tables: parseInt(result.rows[0].table_subscriptions) || 0
      }
    };
  }

  // Obtener notificaciones pendientes (para el scheduler)
  async getPendingNotifications() {
    const query = `
      SELECT sn.*, t.name as table_name, t.module_id, c.name as column_name
      FROM scheduled_notifications sn
      LEFT JOIN tables t ON sn.table_id = t.id
      LEFT JOIN columns c ON sn.column_id = c.id
      WHERE sn.is_active = true 
        AND sn.notification_sent = false
        AND (
          DATE(sn.target_date) <= CURRENT_DATE + INTERVAL '1 day' * sn.notify_before_days
          OR DATE(sn.target_date) <= CURRENT_DATE
        )
      ORDER BY sn.target_date ASC
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => ({
      ...row,
      assigned_users: row.assigned_users // Ya es un array de enteros
    }));
  }

  // Marcar notificación como enviada
  async markNotificationSent(id) {
    const query = `
      UPDATE scheduled_notifications 
      SET notification_sent = true, sent_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await pool.query(query, [id]);
    return true;
  }

  // Obtener notificaciones generales por usuario
  async getUserGeneralNotifications(userId) {
    const query = `
      SELECT n.*, 'general' as notification_type
      FROM notifications n
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Obtener todas las notificaciones combinadas de un usuario
  async getAllUserNotifications(userId) {
    const scheduledQuery = `
      SELECT sn.*, t.name as table_name, t.module_id, c.name as column_name, 'scheduled' as notification_type
      FROM scheduled_notifications sn
      LEFT JOIN tables t ON sn.table_id = t.id
      LEFT JOIN columns c ON sn.column_id = c.id
      WHERE sn.is_active = true 
        AND ($1 = ANY(sn.assigned_users) OR sn.created_by = $1)
      ORDER BY sn.target_date ASC
    `;
    
    const generalQuery = `
      SELECT n.*, 'general' as notification_type, t.name as table_name, t.id as table_id, t.module_id
      FROM notifications n
      LEFT JOIN tables t ON n.link_to_module LIKE '/modulos/%' 
        AND CAST(SUBSTRING(n.link_to_module FROM '/modulos/(.*)') AS INTEGER) = t.id
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
    `;
    
    const [scheduledResult, generalResult] = await Promise.all([
      pool.query(scheduledQuery, [parseInt(userId)]),
      pool.query(generalQuery, [userId])
    ]);
    
    const scheduled = scheduledResult.rows.map(row => ({
      ...row,
      assigned_users: row.assigned_users // Ya es un array de enteros
    }));
    
    const general = generalResult.rows;
    
    return [...scheduled, ...general].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
  }

  // Crear notificación general para usuario
  async createNotificationForUser(userId, title, message, linkToModule, recordId = null) {
    const query = `
      INSERT INTO notifications (user_id, title, message, link_to_module, record_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [userId, title, message, linkToModule, recordId]);
    return result.rows[0];
  }

  // Marcar notificación general como leída
  async markGeneralNotificationAsRead(notificationId) {
    const query = `
      UPDATE notifications 
      SET read = true
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [notificationId]);
    return result.rows[0];
  }

  // Marcar notificación programada como leída
  async markScheduledNotificationAsRead(notificationId) {
    const query = `
      UPDATE scheduled_notifications 
      SET read = true
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [notificationId]);
    return result.rows[0];
  }

  // Notificar a usuarios con notificaciones programadas cuando se actualiza un registro
  async notifyUsersOnRecordUpdate(tableId, recordId) {
    // Obtener nombre de la tabla para el mensaje
    const tableQuery = `SELECT name FROM tables WHERE id = $1`;
    const tableResult = await pool.query(tableQuery, [tableId]);
    const tableName = tableResult.rows[0]?.name || `tabla ${tableId}`;
    
    const query = `
      SELECT DISTINCT unnest(assigned_users) as user_id
      FROM scheduled_notifications
      WHERE table_id = $1 AND record_id = $2 AND is_active = true
    `;
    
    const result = await pool.query(query, [tableId, recordId]);
    const userIds = result.rows.map(row => parseInt(row.user_id));
    
    // Crear notificaciones programadas en lugar de notificaciones generales
    for (const userId of userIds) {
      await this.createScheduledNotification({
        table_id: tableId,
        record_id: recordId,
        column_id: null,
        target_date: new Date().toISOString(), // Notificación inmediata
        notification_title: 'Registro modificado',
        notification_message: `Un registro donde fuiste asignado ha cambiado en la tabla "${tableName}".`,
        notify_before_days: 0,
        assigned_users: [userId],
        created_by: 1 // Usuario del sistema
      });
    }
    
    return userIds.length;
  }

  // Registrar cambio en registro y notificar usuarios
  async logRecordChange(changeData) {
    const { tableId, recordId, changeType, oldData, newData, changedBy, ipAddress, userAgent } = changeData;

    // Registrar el cambio en la tabla record_changes (si existe)
    try {
      const query = `
        INSERT INTO record_changes (
          table_id, record_id, change_type, old_data, new_data, changed_by, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await pool.query(query, [
        tableId, recordId, changeType, JSON.stringify(oldData), JSON.stringify(newData), 
        changedBy, ipAddress, userAgent
      ]);

      // Si es una actualización, notificar a usuarios con notificaciones programadas
      if (changeType === 'update') {
        await this.notifyUsersOnRecordUpdate(tableId, recordId);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error logging record change:', error);
      // No lanzar error para no interrumpir el flujo principal
      return null;
    }
  }

  // Obtener notificaciones que deben ser enviadas (fecha objetivo alcanzada)
  async getNotificationsDueForSending() {
    const query = `
      SELECT sn.*, t.name as table_name, t.module_id, c.name as column_name
      FROM scheduled_notifications sn
      LEFT JOIN tables t ON sn.table_id = t.id
      LEFT JOIN columns c ON sn.column_id = c.id
      WHERE sn.is_active = true 
        AND (sn.notification_sent = false OR sn.notification_sent IS NULL)
        AND sn.target_date <= NOW()
      ORDER BY sn.target_date ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  // Procesar notificaciones programadas que han alcanzado su fecha objetivo
  async processDueNotifications() {
    try {
      const dueNotifications = await this.getNotificationsDueForSending();
      let processedCount = 0;

      for (const notification of dueNotifications) {
        try {
          // Crear notificación en la tabla notifications para cada usuario asignado
          if (notification.assigned_users && notification.assigned_users.length > 0) {
            for (const userId of notification.assigned_users) {
              await this.createNotificationInTable(
                userId,
                notification.notification_title,
                notification.notification_message,
                `/modulos/${notification.module_id}`, // Usar module_id para la navegación
                notification.record_id // Agregar record_id para navegación directa al registro
              );
            }
          }

          // Marcar la notificación programada como enviada
          await this.markNotificationSent(notification.id);
          processedCount++;

          console.log(`Notificación procesada: ${notification.notification_title} para ${notification.assigned_users?.length || 0} usuarios`);
        } catch (error) {
          console.error(`Error procesando notificación ${notification.id}:`, error);
        }
      }

      return processedCount;
    } catch (error) {
      console.error('Error en processDueNotifications:', error);
      throw error;
    }
  }

  // Crear notificación en la tabla notifications
  async createNotificationInTable(userId, title, message, linkToModule, recordId = null) {
    const query = `
      INSERT INTO notifications (user_id, title, message, link_to_module, record_id, read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      parseInt(userId),
      title,
      message || '',
      linkToModule || null,
      recordId || null,
      false
    ]);
    
    return result.rows[0];
  }

  // Función para compatibilidad con el scheduler existente
  async processDailyNotifications() {
    return await this.processDueNotifications();
  }
}

module.exports = new ScheduledNotificationsService();
