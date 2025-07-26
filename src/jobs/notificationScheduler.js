const cron = require('node-cron');
const scheduledNotificationsService = require('../services/scheduledNotificationsService');

class NotificationScheduler {
  constructor() {
    this.jobs = [];
  }

  // Iniciar el programador de notificaciones
  start() {
    // Ejecutar cada 5 minutos para verificar notificaciones programadas
    const frequentJob = cron.schedule('*/5 * * * *', async () => {
      try {
        console.log('Verificando notificaciones programadas...');
        const processedCount = await scheduledNotificationsService.processDueNotifications();
        if (processedCount > 0) {
          console.log(`Se procesaron ${processedCount} notificaciones`);
        }
      } catch (error) {
        console.error('Error procesando notificaciones programadas:', error);
      }
    }, {
      timezone: 'America/Mexico_City'
    });

    // Ejecutar cada día a las 9:00 AM para procesamiento diario adicional
    const dailyJob = cron.schedule('0 9 * * *', async () => {
      try {
        console.log('Ejecutando proceso de notificaciones diarias...');
        const processedCount = await scheduledNotificationsService.processDueNotifications();
        console.log(`Se procesaron ${processedCount} notificaciones en el proceso diario`);
      } catch (error) {
        console.error('Error procesando notificaciones diarias:', error);
      }
    }, {
      timezone: 'America/Mexico_City'
    });

    // Ejecutar cada hora para verificar notificaciones urgentes (mantener compatibilidad)
    const hourlyJob = cron.schedule('0 * * * *', async () => {
      try {
        console.log('Verificando notificaciones urgentes por hora...');
        const notifications = await scheduledNotificationsService.getNotificationsDueForSending();
        
        if (notifications.length > 0) {
          console.log(`Se encontraron ${notifications.length} notificaciones urgentes`);
          await scheduledNotificationsService.processDueNotifications();
        }
      } catch (error) {
        console.error('Error verificando notificaciones urgentes:', error);
      }
    });

    this.jobs.push(frequentJob, dailyJob, hourlyJob);
    console.log('Programador de notificaciones iniciado - Revisión cada 5 minutos');
  }

  // Detener todos los trabajos programados
  stop() {
    this.jobs.forEach(job => job.destroy());
    this.jobs = [];
    console.log('Programador de notificaciones detenido');
  }

  // Ejecutar manualmente el proceso de notificaciones
  async processNotificationsManually() {
    try {
      console.log('Ejecutando proceso manual de notificaciones...');
      const processedCount = await scheduledNotificationsService.processDueNotifications();
      console.log(`Se procesaron ${processedCount} notificaciones manualmente`);
      return processedCount;
    } catch (error) {
      console.error('Error en proceso manual de notificaciones:', error);
      throw error;
    }
  }
}

module.exports = new NotificationScheduler();
