const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');

router.get('/', notificationsController.getNotifications);
router.post('/', notificationsController.createNotification);
router.get('/user/:user_id', notificationsController.getNotificationsByUser);
router.put('/:notification_id/read', notificationsController.markAsRead);
router.put('/user/:user_id/read-all', notificationsController.markAllAsRead);
router.delete('/:notification_id', notificationsController.deleteNotification);
router.delete('/user/:user_id', notificationsController.deleteAllNotifications);
router.get('/user/:user_id/unread-count', notificationsController.countUnread);
router.post('/massive', notificationsController.createMassiveNotifications);

module.exports = router;