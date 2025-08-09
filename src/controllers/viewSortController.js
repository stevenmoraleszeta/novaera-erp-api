const viewSortService = require('../services/viewSortService');

exports.getViewSortsByViewId = async (req, res) => {
  try {
    const { view_id } = req.params;
    const sorts = await viewSortService.getViewSortsByViewId(view_id, req.companySchema);
    res.json(sorts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createViewSort = async (req, res) => {
  try {
    const sortData = req.body;
    const result = await viewSortService.createViewSort(sortData, req.companySchema);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateViewSort = async (req, res) => {
  try {
    const { id } = req.params;
    const { column_id, direction } = req.body;

    const result = await viewSortService.updateViewSort({ id, column_id, direction }, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteViewSort = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await viewSortService.deleteViewSort(id, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateViewSortPosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { position } = req.body;

    if (position === undefined || isNaN(position)) {
      return res.status(400).json({ error: 'La nueva posición es requerida y debe ser un número.' });
    }

    const result = await viewSortService.updateViewSortPosition({ id, newPosition: Number(position, req.companySchema) });
    res.json(result);
  } catch (err) {
    console.error('Error actualizando posición del ordenamiento:', err);
    res.status(500).json({ error: 'Error actualizando la posición del ordenamiento.' });
  }
};
