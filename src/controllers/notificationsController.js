const notificationsService = require('../services/notificationsService');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await notificationsService.getNotifications(req.companySchema);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const notificationData = req.body;
    const result = await notificationsService.createNotification(notificationData, req.companySchema);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNotificationsByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const notifications = await notificationsService.getNotificationsByUser(user_id, req.companySchema);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { user_id } = req.body;
    const result = await notificationsService.markAsRead(user_id, notification_id, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await notificationsService.markAllAsRead(user_id, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { user_id } = req.body;
    const result = await notificationsService.deleteNotification(user_id, notification_id, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAllNotifications = async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await notificationsService.deleteAllNotifications(user_id, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.deactivateGeneral = async (req, res) => {
  try {
    const { id } = req.params;
    await notificationsService.deactivateGeneralNotification(id, req.companySchema);
    res.json({
      success: true,
        message: 'Notificación general desactivada exitosamente'
      });
    } catch (error) {
      console.error('Error desactivando notificación general:', error);
      res.status(500).json({
        success: false,
        error: 'Error al desactivar la notificación general'
      });
    }
  }
exports.countUnread = async (req, res) => {
  try {
    const { user_id } = req.params;
    const count = await notificationsService.countUnread(user_id, req.companySchema);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createMassiveNotifications = async (req, res) => {
  try {
    const { user_ids, title, message, link_to_module } = req.body;
    const result = await notificationsService.createMassiveNotifications(user_ids, title, message, link_to_module, req.companySchema);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};