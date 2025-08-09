  // Desactivar notificación normal (soft delete)
  
  

const scheduledNotificationsService = require('../services/scheduledNotificationsService');

class ScheduledNotificationsController {
  
  // Crear notificación programada
  async create(req, res) {
    try {
      const notification = await scheduledNotificationsService.createScheduledNotification({
        ...req.body,
        created_by: req.user.id
      }, req.companySchema);
      
      res.status(201).json({
        success: true,
        data: notification,
        message: 'Notificación programada creada exitosamente'
      });
    } catch (error) {
      console.error('Error creating scheduled notification:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al crear la notificación programada' 
      });
    }
  }
  
  // Obtener notificaciones programadas de un usuario
  async getByUser(req, res) {
    try {
      const notifications = await scheduledNotificationsService.getUserScheduledNotifications(req.user.id, req.companySchema);
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      console.error('Error getting user scheduled notifications:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las notificaciones programadas' 
      });
    }
  }

  // Obtener notificaciones por tabla
  async getByTable(req, res) {
    try {
      const { tableId } = req.params;
      const notifications = await scheduledNotificationsService.getNotificationsByTable(tableId, req.companySchema);
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      console.error('Error getting notifications by table:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las notificaciones de la tabla' 
      });
    }
  }

  // Obtener notificaciones por registro específico
  async getByRecord(req, res) {
    try {
      const { tableId, recordId } = req.params;
      const notifications = await scheduledNotificationsService.getNotificationsByRecord(tableId, recordId, req.companySchema);
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      console.error('Error getting notifications by record:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las notificaciones del registro' 
      });
    }
  }

  async deactivate(req, res) {
    try {
      const { id } = req.params;
      await scheduledNotificationsService.deactivateScheduledNotification(id, req.companySchema);
      res.json({
        success: true,
        message: 'Notificación desactivada exitosamente'
      });
    } catch (error) {
      console.error('Error deactivando notificación:', error);
      res.status(500).json({
        success: false,
        error: 'Error al desactivar la notificación'
      });
    }
  }

  // Desactivar todas las notificaciones (scheduled y generales)
  async deactivateAll(req, res) {
    try {
      await scheduledNotificationsService.deactivateAllNotifications(req.companySchema);
      res.json({
        success: true,
        message: 'Todas las notificaciones han sido desactivadas'
      });
    } catch (error) {
      console.error('Error desactivando todas las notificaciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error al desactivar todas las notificaciones'
      });
    }
  }
  // Obtener estadísticas de notificaciones
  async getStats(req, res) {
    try {
      const stats = await scheduledNotificationsService.getStats(req.companySchema);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting notification stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las estadísticas' 
      });
    }
  }

  // Obtener columnas de fecha de una tabla
  async getDateColumns(req, res) {
    try {
      const { tableId } = req.params;
      const columns = await scheduledNotificationsService.getDateColumns(tableId, req.companySchema);
      res.json({
        success: true,
        data: columns
      });
    } catch (error) {
      console.error('Error getting date columns:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las columnas de fecha' 
      });
    }
  }
  
  // Actualizar notificación programada
  async update(req, res) {
    try {
      const { id } = req.params;
      const notification = await scheduledNotificationsService.updateScheduledNotification(id, req.body, req.companySchema);
      
      res.json({
        success: true,
        data: notification,
        message: 'Notificación actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error updating scheduled notification:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al actualizar la notificación' 
      });
    }
  }

  // Eliminar notificación programada
  async delete(req, res) {
    try {
      const { id } = req.params;
      await scheduledNotificationsService.deleteScheduledNotification(id, req.companySchema);
      
      res.json({
        success: true,
        message: 'Notificación eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error deleting scheduled notification:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al eliminar la notificación' 
      });
    }
  }

  // Suscribirse a cambios
  async subscribe(req, res) {
    try {
      const subscription = await scheduledNotificationsService.subscribeToRecord({
        ...req.body,
        user_id: req.user.id,
        created_by: req.user.id
      }, req.companySchema);
      
      res.status(201).json({
        success: true,
        data: subscription,
        message: 'Suscripción creada exitosamente'
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al crear la suscripción' 
      });
    }
  }

  // Obtener suscripciones del usuario
  async getUserSubscriptions(req, res) {
    try {
      const subscriptions = await scheduledNotificationsService.getUserSubscriptions(req.user.id, req.companySchema);
      res.json({
        success: true,
        data: subscriptions
      });
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las suscripciones' 
      });
    }
  }

  // Verificar suscripción
  async checkSubscription(req, res) {
    try {
      const { tableId, recordId } = req.params;
      const isSubscribed = await scheduledNotificationsService.checkSubscription(
        req.user.id, 
        tableId, 
        recordId
      , req.companySchema);
      res.json({
        success: true,
        data: { isSubscribed }
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al verificar la suscripción' 
      });
    }
  }

  // Obtener estadísticas de suscripciones
  async getSubscriptionStats(req, res) {
    try {
      const stats = await scheduledNotificationsService.getSubscriptionStats(req.companySchema);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las estadísticas de suscripciones' 
      });
    }
  }

  // Eliminar suscripción
  async deleteSubscription(req, res) {
    try {
      const { id } = req.params;
      await scheduledNotificationsService.deleteSubscription(id, req.companySchema);
      
      res.json({
        success: true,
        message: 'Suscripción eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error deleting subscription:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al eliminar la suscripción' 
      });
    }
  }

  // Obtener todas las notificaciones de un usuario (combinadas)
  async getAllUserNotifications(req, res) {
    try {
      const { userId } = req.params;
      const notifications = await scheduledNotificationsService.getAllUserNotifications(userId, req.companySchema);
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      console.error('Error getting all user notifications:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las notificaciones' 
      });
    }
  }

  // Obtener notificaciones generales de un usuario
  async getUserGeneralNotifications(req, res) {
    try {
      const { userId } = req.params;
      const notifications = await scheduledNotificationsService.getUserGeneralNotifications(userId, req.companySchema);
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      console.error('Error getting user general notifications:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las notificaciones generales' 
      });
    }
  }

  // Marcar notificación general como leída
  async markGeneralNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const notification = await scheduledNotificationsService.markGeneralNotificationAsRead(notificationId, req.companySchema);
      res.json({
        success: true,
        data: notification,
        message: 'Notificación marcada como leída'
      });
    } catch (error) {
      console.error('Error marking general notification as read:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al marcar la notificación como leída' 
      });
    }
  }

  // Marcar notificación programada como leída
  async markScheduledNotificationAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const notification = await scheduledNotificationsService.markScheduledNotificationAsRead(notificationId, req.companySchema);
      res.json({
        success: true,
        data: notification,
        message: 'Notificación programada marcada como leída'
      });
    } catch (error) {
      console.error('Error marking scheduled notification as read:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al marcar la notificación programada como leída' 
      });
    }
  }
}

module.exports = new ScheduledNotificationsController();
