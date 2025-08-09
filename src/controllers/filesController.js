const filesService = require('../services/filesService');

const filesController = {
  // Subir archivo
  async uploadFile(req, res) {
    try {
      const { originalName, mimeType, fileData } = req.body;
      const userId = req.user.id;
      
      const uploadedFile = await filesService.uploadFile({
        originalName,
        mimeType,
        fileDataBase64: fileData,
        userId
      }, req.companySchema);
      
      res.json({
        success: true,
        file: uploadedFile
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Descargar archivo
  async downloadFile(req, res) {
    try {
      const { id } = req.params;
      const file = await filesService.getFile(id, req.companySchema);
      
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
      res.setHeader('Content-Length', file.file_size);
      
      res.send(file.file_data);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(404).json({ error: error.message });
    }
  },

  // Ver archivo en el navegador
  async viewFile(req, res) {
    try {
      const { id } = req.params;
      const file = await filesService.getFile(id, req.companySchema);
      
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${file.original_name}"`);
      res.setHeader('Content-Length', file.file_size);
      
      res.send(file.file_data);
    } catch (error) {
      console.error('Error viewing file:', error);
      res.status(404).json({ error: error.message });
    }
  },

  // Obtener información del archivo
  async getFileInfo(req, res) {
    try {
      const { id } = req.params;
      const fileInfo = await filesService.getFileInfo(id, req.companySchema);
      
      if (!fileInfo) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }
      
      res.json(fileInfo);
    } catch (error) {
      console.error('Error getting file info:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Eliminar archivo
  async deleteFile(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await filesService.deleteFile(id, userId, req.companySchema);
      res.json(result);
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Obtener archivos del usuario
  async getUserFiles(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await filesService.getFilesByUser(userId, page, limit, req.companySchema);
      res.json(result);
    } catch (error) {
      console.error('Error getting user files:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Validar integridad del archivo
  async validateFile(req, res) {
    try {
      const { id } = req.params;
      const validation = await filesService.validateFileIntegrity(id, req.companySchema);
      res.json(validation);
    } catch (error) {
      console.error('Error validating file:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = filesController;
