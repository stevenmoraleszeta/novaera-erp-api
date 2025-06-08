const express = require('express');
const cors = require('cors');
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

const app = express();
app.use(cors());
app.use(express.json());

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

module.exports = app;