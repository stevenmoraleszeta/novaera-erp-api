const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const modulesRoutes = require('./routes/modules');
const tablesRoutes = require('./routes/tables');
const columnsRoutes = require('./routes/columns');
const recordsRoutes = require('./routes/records');
const usersRoutes = require('./routes/users');
const rolesRoutes = require('./routes/roles');
const permissionsRoutes = require('./routes/permissions');
const notificationsRoutes = require('./routes/notifications');
const authRoutes = require('./routes/auth');
const companiesRoutes = require('./routes/companies');
const authMiddleware = require('./middleware/authMiddleware');
const { companyMiddleware } = require('./middleware/companyMiddleware');
const viewsRoutes = require('./routes/views');
const filesRoutes = require('./routes/files');
const scheduledNotificationsRoutes = require('./routes/scheduledNotifications');
const recordAssignedUsersRoutes = require('./routes/recordAssignedUsers');
const recordCommentsRoutes = require('./routes/recordComments');
const tableCollaboratorsRoutes = require('./routes/tableCollaborators');

const columnOptionsRoutes = require('./routes/columnOptions');

const viewSortRoutes = require('./routes/viewSortRoutes');

const auditLogRoutes = require('./routes/auditLog');

// Importar y iniciar el scheduler de notificaciones
const notificationScheduler = require('./jobs/notificationScheduler');

const app = express();

app.set('trust proxy', 1);

const allowedOrigins = ['http://localhost:3000', 'https://erp-system-17kb.vercel.app'];
app.use(cors({
  origin: function(origin, callback) {
    // Permitir solicitudes sin origen (como Postman) o si el origen está en la lista
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

// Aumentar límite para archivos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Rutas públicas (no requieren autenticación)
app.use('/api/auth', authRoutes); 
app.use('/api/companies', companiesRoutes);

// Middleware de autenticación para rutas protegidas
app.use(authMiddleware);

// Rutas que requieren empresa activa (multiempresa)
app.use('/api/modules', companyMiddleware, modulesRoutes);
app.use('/api/tables', companyMiddleware, tablesRoutes);
app.use('/api/columns', companyMiddleware, columnsRoutes);
app.use('/api/records', companyMiddleware, recordsRoutes);
app.use('/api/users', companyMiddleware, usersRoutes);
app.use('/api/roles', companyMiddleware, rolesRoutes);
app.use('/api/permissions', companyMiddleware, permissionsRoutes);
app.use('/api/notifications', companyMiddleware, notificationsRoutes);
app.use('/api/views', companyMiddleware, viewsRoutes);
app.use('/api/files', companyMiddleware, filesRoutes);
app.use('/api/scheduled-notifications', companyMiddleware, scheduledNotificationsRoutes);
app.use('/api/record-assigned-users', companyMiddleware, recordAssignedUsersRoutes);
app.use('/api/record-comments', companyMiddleware, recordCommentsRoutes);
app.use('/api/table-collaborators', companyMiddleware, tableCollaboratorsRoutes);
app.use('/api', companyMiddleware, columnOptionsRoutes);
app.use('/api/view-sorts', companyMiddleware, viewSortRoutes);
app.use('/api/audit-log', companyMiddleware, auditLogRoutes);

// Iniciar el scheduler de notificaciones programadas
notificationScheduler.start();

module.exports = app;
