const modulesService = require('../services/modulesService');

exports.getModules = async (req, res) => {
  try {
    const { order_by } = req.query; // 'fecha' o 'nombre'
    const modules = await modulesService.getModules(order_by);
    res.json(modules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createModule = async (req, res) => {
  try {
    const moduleData = req.body;
    const result = await modulesService.createModule(moduleData);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getModuleById = async (req, res) => {
  try {
    const { id } = req.params;
    const module = await modulesService.getModuleById(id);
    res.json(module);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon_url, position_num } = req.body;
    const result = await modulesService.updateModule({ id, name, description, icon_url, position_num });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { cascada } = req.query; // true/false
    const result = await modulesService.deleteModule(id, cascada);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.existsTableNameInModule = async (req, res) => {
  try {
    const { module_id, table_name } = req.query;
    const exists = await modulesService.existsTableNameInModule(module_id, table_name);
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateModulePosition = async (req, res) => {
  try {
    const { module_id } = req.params;
    const { position } = req.body;

    if (position === undefined || isNaN(position)) {
      return res.status(400).json({ error: 'La nueva posición es requerida y debe ser un número.' });
    }

    await modulesService.updateModulePosition(module_id, Number(position));

    res.json({ message: 'Posición actualizada correctamente.' });
  } catch (err) {
    console.error('Error actualizando posición del módulo:', err);
    res.status(500).json({ error: 'Error actualizando la posición del módulo.' });
  }
};
