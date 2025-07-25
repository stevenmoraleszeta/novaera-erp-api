const viewService = require('../services/viewsService');

exports.getViewsByTable = async (req, res) => {
  try {
    const { table_id } = req.query;
    if (!table_id) {
      return res.status(400).json({ error: 'Falta el parámetro table_id.' });
    }

    const views = await viewService.getViewsByTable(table_id);
    res.json(views);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createView = async (req, res) => {
  try {
    const { table_id, name, sort_by, sort_direction, position_num } = req.body;
    const result = await viewService.createView({
      table_id,
      name,
      sort_by,
      sort_direction,
      position_num
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.addColumnToView = async (req, res) => {
  try {
    const { view_id, column_id, visible, filter_condition, filter_value, position_num, width_px } = req.body;

    const result = await viewService.addColumnToView({
      view_id,
      column_id,
      visible,
      filter_condition,
      filter_value,
      position_num,
      width_px
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getColumnsByView = async (req, res) => {
  try {
    const { view_id } = req.query;
    if (!view_id) {
      return res.status(400).json({ error: 'Falta el parámetro view_id.' });
    }

    const columns = await viewService.getColumnsByView(view_id);
    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteView = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await viewService.deleteView(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.updateView = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const result = await viewService.updateView({ id, ...updatedData });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateViewColumn = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    console.log("clap data", updatedData)
    const result = await viewService.updateViewColumn({ id, ...updatedData });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateViewPosition = async (req, res) => {

  try {
    const { id } = req.params;
    const { position } = req.body;

    if (position === undefined || isNaN(position)) {
      return res.status(400).json({ error: 'La nueva posición es requerida y debe ser un número.' });
    }

    await viewService.updateViewPosition(id, Number(position));

    res.json({ message: 'Posición actualizada correctamente.' });
  } catch (err) {
    console.error('Error actualizando posición de vista:', err);
    res.status(500).json({ error: 'Error actualizando la posición de la vista.' });
  }
};

exports.updateViewColumnPosition = async (req, res) => {

  try {
    const { id } = req.params;
    const { position } = req.body;

    if (position === undefined || isNaN(position)) {
      return res.status(400).json({ error: 'La nueva posición es requerida y debe ser un número.' });
    }

    await viewService.updateViewColumnPosition(id, Number(position));

    res.json({ message: 'Posición actualizada correctamente.' });
  } catch (err) {
    console.error('Error actualizando posición de column view:', err);
    res.status(500).json({ error: 'Error actualizando la posición de la view_column.' });
  }
};

exports.deleteViewColumn = async (req, res) => {
  try {
    const { id } = req.params; // ← este es el id del view_column

    const result = await viewService.deleteViewColumn(id);
    res.json({ message: 'Columna eliminada de la vista correctamente.', result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



