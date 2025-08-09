const tablesService = require('../services/tablesService');

exports.getTables = async (req, res) => {
  try {
    const tables = await tablesService.getTables(req.companySchema);
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTable = async (req, res) => {
  try {
    const tableData = req.body;
    const {
      module_id,
      name,
      description,
      original_table_id,
      foreign_table_id,
      position_num
    } = tableData;
    const result = await tablesService.createTable({
      module_id,
      name,
      description,
      original_table_id,
      foreign_table_id,
      position_num
    }, req.companySchema);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTablesByModule = async (req, res) => {
  try {
    const { module_id } = req.params;
    const tables = await tablesService.getTablesByModule(module_id, req.companySchema);
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTableById = async (req, res) => {
  try {
    const { table_id } = req.params;
    const table = await tablesService.getTableById(table_id, req.companySchema);
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const {
      name,
      description,
      original_table_id,
      foreign_table_id,
      position_num
    } = req.body;
    const result = await tablesService.updateTable({
      table_id,
      name,
      description,
      original_table_id,
      foreign_table_id,
      position_num
    }, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const result = await tablesService.deleteTable(table_id, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.existsTableNameInModule = async (req, res) => {
  try {
    const { module_id, name } = req.query;
    const exists = await tablesService.existsTableNameInModule(module_id, name, req.companySchema);
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOrCreateJoinTable = async (req, res) => {
  try {
    const { tableA_id, tableB_id, forName } = req.body;
    if (!tableA_id || !tableB_id) {
      return res.status(400).json({ error: 'tableA_id y tableB_id son requeridos' });
    }
    const result = await tablesService.getOrCreateJoinTable(tableA_id, tableB_id, forName, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTablePosition = async (req, res) => {
  try {
    const { table_id } = req.params;
    const { position } = req.body;

    if (position === undefined || isNaN(position)) {
      return res.status(400).json({ error: 'La nueva posición es requerida y debe ser un número.' });
    }

    await tablesService.updateTablePosition(table_id, Number(position), req.companySchema);

    res.json({ message: 'Posición actualizada correctamente.' });
  } catch (err) {
    console.error('Error actualizando posición de tabla:', err);
    res.status(500).json({ error: 'Error actualizando la posición de la tabla.' });
  }
};