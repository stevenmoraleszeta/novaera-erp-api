const recordAssignedUsersService = require('../services/recordAssignedUsersService');

// Obtener usuarios asignados a un record
exports.getAssignedUsersByRecord = async (req, res) => {
  try {
    const { record_id } = req.params;
    const users = await recordAssignedUsersService.getAssignedUsersByRecord(record_id, req.companySchema);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Asignar usuarios a un record
exports.setAssignedUsersForRecord = async (req, res) => {
  try {
    const { record_id } = req.params;
    const { user_ids } = req.body; // array de IDs
    await recordAssignedUsersService.setAssignedUsersForRecord(record_id, user_ids, req.companySchema);
    res.json({ message: 'Usuarios asignados correctamente.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verificar si una tabla tiene usuarios asignados
exports.hasAssignedUsersInTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const hasUsers = await recordAssignedUsersService.hasAssignedUsersInTable(table_id, req.companySchema);
    res.json({ hasUsers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener estadísticas de usuarios asignados por tabla
exports.getAssignedUsersStatsForTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const stats = await recordAssignedUsersService.getAssignedUsersStatsForTable(table_id, req.companySchema);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
