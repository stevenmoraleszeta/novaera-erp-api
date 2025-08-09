const recordSubscriptionsService = require('../services/recordSubscriptionsService');

class RecordSubscriptionsController {
  
  // Suscribirse a un registro o tabla
  async subscribe(req, res) {
    try {
      const subscription = await recordSubscriptionsService.subscribeToRecord({
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
  
  // Obtener suscripciones de un usuario
  async getUserSubscriptions(req, res) {
    try {
      const subscriptions = await recordSubscriptionsService.getUserSubscriptions(req.user.id, req.companySchema);
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

  // Verificar si está suscrito
  async checkSubscription(req, res) {
    try {
      const { tableId, recordId } = req.params;
      const isSubscribed = await recordSubscriptionsService.isUserSubscribed(
        req.user.id, 
        tableId, 
        recordId === 'null' ? null : recordId
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

  // Obtener historial de cambios
  async getRecordChanges(req, res) {
    try {
      const { tableId, recordId } = req.params;
      const { limit = 50 } = req.query;
      
      const changes = await recordSubscriptionsService.getRecordChanges(
        tableId, 
        recordId, 
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: changes
      });
    } catch (error) {
      console.error('Error getting record changes:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener el historial de cambios' 
      });
    }
  }

  // Obtener estadísticas de suscripciones
  async getStats(req, res) {
    try {
      const stats = await recordSubscriptionsService.getStats(req.companySchema);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting subscription stats:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las estadísticas' 
      });
    }
  }
  
  // Actualizar suscripción
  async updateSubscription(req, res) {
    try {
      const subscription = await recordSubscriptionsService.updateSubscription(
        req.params.id,
        req.body
      , req.companySchema);
      
      res.json({
        success: true,
        data: subscription,
        message: 'Suscripción actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al actualizar la suscripción' 
      });
    }
  }
  
  // Eliminar suscripción
  async deleteSubscription(req, res) {
    try {
      await recordSubscriptionsService.deleteSubscription(req.params.id, req.companySchema);
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
}

module.exports = new RecordSubscriptionsController();
