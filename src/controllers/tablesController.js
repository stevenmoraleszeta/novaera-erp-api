const tablesService = require('../services/tablesService');

exports.getTables = async (req, res) => {
  try {
    const tables = await tablesService.getTables();
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTable = async (req, res) => {
  try {
    const tableData = req.body;
    const result = await tablesService.createTable(tableData);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTablesByModule = async (req, res) => {
  try {
    const { module_id } = req.params;
    const tables = await tablesService.getTablesByModule(module_id);
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTableById = async (req, res) => {
  try {
    const { table_id } = req.params;
    const table = await tablesService.getTableById(table_id);
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const { name, description } = req.body;
    const result = await tablesService.updateTable({ table_id, name, description });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const result = await tablesService.deleteTable(table_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.existsTableNameInModule = async (req, res) => {
  try {
    const { module_id, name } = req.query;
    const exists = await tablesService.existsTableNameInModule(module_id, name);
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};