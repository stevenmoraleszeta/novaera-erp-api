// Controlador para opciones personalizadas de columnas
const columnOptionsService = require('../services/columnOptionsService');

// Crear/actualizar opciones personalizadas para una columna
exports.createColumnOptions = async (req, res) => {
  try {
    const { columnId } = req.params;
    const { options } = req.body;
    
    // Validar que la columna exista
    const columnExists = await columnOptionsService.columnExists(columnId, req.companySchema);
    if (!columnExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'La columna no existe' 
      });
    }
    
    // Validar que options sea un array
    if (!Array.isArray(options)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Las opciones deben ser un array' 
      });
    }
    
    // Validar estructura de cada opción
    for (const option of options) {
      if (!option.value || !option.label) {
        return res.status(400).json({ 
          success: false, 
          message: 'Cada opción debe tener value y label' 
        });
      }
    }
    
    await columnOptionsService.createColumnOptions(columnId, options, req.companySchema);
    res.json({ success: true, message: 'Opciones creadas exitosamente' });
  } catch (error) {
    console.error('Error creating column options:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al crear opciones',
      error: error.message 
    });
  }
};

// Obtener opciones de una columna
exports.getColumnOptions = async (req, res) => {
  try {
    const { columnId } = req.params;
    
    // Validar que la columna exista
    const columnExists = await columnOptionsService.columnExists(columnId, req.companySchema);
    if (!columnExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'La columna no existe' 
      });
    }
    
    const options = await columnOptionsService.getColumnOptions(columnId, req.companySchema);
    res.json({ success: true, options });
  } catch (error) {
    console.error('Error getting column options:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener opciones',
      error: error.message 
    });
  }
};

// Obtener todas las opciones disponibles para una columna (personalizadas o de tabla)
exports.getAvailableOptions = async (req, res) => {
  try {
    const { columnId } = req.params;
    
    // Validar que la columna exista
    const columnExists = await columnOptionsService.columnExists(columnId, req.companySchema);
    if (!columnExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'La columna no existe' 
      });
    }
    
    const options = await columnOptionsService.getAvailableOptions(columnId, req.companySchema);
    res.json({ success: true, options });
  } catch (error) {
    console.error('Error getting available options:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al obtener opciones disponibles',
      error: error.message 
    });
  }
};

// Actualizar una opción específica
exports.updateColumnOption = async (req, res) => {
  try {
    const { optionId } = req.params;
    const optionData = req.body;
    
    // Validar datos requeridos
    if (!optionData.option_value || !optionData.option_label) {
      return res.status(400).json({ 
        success: false, 
        message: 'option_value y option_label son requeridos' 
      });
    }
    
    const updatedOption = await columnOptionsService.updateColumnOption(optionId, optionData, req.companySchema);
    
    if (!updatedOption) {
      return res.status(404).json({ 
        success: false, 
        message: 'Opción no encontrada' 
      });
    }
    
    res.json({ success: true, option: updatedOption });
  } catch (error) {
    console.error('Error updating column option:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al actualizar opción',
      error: error.message 
    });
  }
};

// Eliminar una opción específica
exports.deleteColumnOption = async (req, res) => {
  try {
    const { optionId } = req.params;
    
    const deletedOption = await columnOptionsService.deleteColumnOption(optionId, req.companySchema);
    
    if (!deletedOption) {
      return res.status(404).json({ 
        success: false, 
        message: 'Opción no encontrada' 
      });
    }
    
    res.json({ success: true, message: 'Opción eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting column option:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar opción',
      error: error.message 
    });
  }
};

// Eliminar todas las opciones de una columna
exports.deleteColumnOptions = async (req, res) => {
  try {
    const { columnId } = req.params;
    
    // Validar que la columna exista
    const columnExists = await columnOptionsService.columnExists(columnId, req.companySchema);
    if (!columnExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'La columna no existe' 
      });
    }
    
    await columnOptionsService.deleteColumnOptions(columnId, req.companySchema);
    res.json({ success: true, message: 'Opciones eliminadas exitosamente' });
  } catch (error) {
    console.error('Error deleting column options:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al eliminar opciones',
      error: error.message 
    });
  }
};
