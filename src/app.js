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
const authMiddleware = require('./middleware/authMiddleware');
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

app.use('/api/auth', authRoutes); 

app.use(authMiddleware);

app.use('/api/modules', modulesRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/columns', columnsRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/views', viewsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/scheduled-notifications', scheduledNotificationsRoutes);
app.use('/api/record-assigned-users', recordAssignedUsersRoutes);
app.use('/api/record-comments', recordCommentsRoutes);
app.use('/api/table-collaborators', tableCollaboratorsRoutes);
app.use('/api', columnOptionsRoutes);
app.use('/api/view-sorts', viewSortRoutes);

app.use('/api/audit-log', auditLogRoutes);

// Iniciar el scheduler de notificaciones programadas
notificationScheduler.start();

module.exports = app;
