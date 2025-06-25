const columnsService = require('../services/columnsService');

exports.getColumns = async (req, res) => {
  try {
    const columns = await columnsService.getColumns();
    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createColumn = async (req, res) => {
  try {
    const columnData = req.body;
    const result = await columnsService.createColumn(columnData);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getColumnsByTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const columns = await columnsService.getColumnsByTable(table_id);
    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getColumnById = async (req, res) => {
  try {
    const { column_id } = req.params;
    const column = await columnsService.getColumnById(column_id);
    res.json(column);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateColumn = async (req, res) => {
  try {
    const { column_id } = req.params;
    const { name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations } = req.body;
    const result = await columnsService.updateColumn({ column_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteColumn = async (req, res) => {
  try {
    const { column_id } = req.params;
    const result = await columnsService.deleteColumn(column_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.existsColumnNameInTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const { name } = req.query;
    const exists = await columnsService.existsColumnNameInTable(table_id, name);
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.columnHasRecords = async (req, res) => {
  try {
    const { column_id } = req.params;
    const hasRecords = await columnsService.columnHasRecords(column_id);
    res.json({ hasRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateColumnPosition = async (req, res) => {
  try {
    const { column_id } = req.params;
    const { position } = req.body;

    if (position === undefined || isNaN(position)) {
      return res.status(400).json({ error: 'La nueva posición es requerida y debe ser un número.' });
    }

    await columnsService.updateColumnPosition(column_id, Number(position));

    res.json({ message: 'Posición actualizada correctamente.' });
  } catch (err) {
    console.error('Error actualizando posición de columna:', err);
    res.status(500).json({ error: 'Error actualizando la posición de la columna.' });
  }
};
