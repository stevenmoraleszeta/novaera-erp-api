const companiesService = require('../services/companiesService');

class CompaniesController {
  
  // Crear nueva empresa
  async createCompany(req, res) {
    try {
      const {
        company_name,
        email,
        phone,
        address,
        admin_name,
        admin_email,
        admin_password
      } = req.body;
      
      // Validaciones básicas
      if (!company_name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Nombre de empresa y email son requeridos'
        });
      }
      
      if (admin_name && admin_email && !admin_password) {
        return res.status(400).json({
          success: false,
          error: 'Contraseña del administrador es requerida cuando se proporciona usuario administrador'
        });
      }
      
      const result = await companiesService.createCompany({
        company_name,
        email,
        phone,
        address,
        admin_name,
        admin_email,
        admin_password
      });
      
      res.status(201).json(result);
      
    } catch (error) {
      console.error('Error en createCompany controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Obtener empresa por código
  async getCompanyByCode(req, res) {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Código de empresa es requerido'
        });
      }
      
      const company = await companiesService.getCompanyByCode(code);
      
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Empresa no encontrada'
        });
      }
      
      // No devolver información sensible
      delete company.schema_name;
      
      res.json({
        success: true,
        data: company
      });
      
    } catch (error) {
      console.error('Error en getCompanyByCode controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Validar código de empresa para login
  async validateCompanyCode(req, res) {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Código de empresa es requerido'
        });
      }
      
      const company = await companiesService.getCompanyByCode(code);
      
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Código de empresa inválido'
        });
      }
      
      res.json({
        success: true,
        data: {
          company_id: company.id,
          company_name: company.company_name,
          company_code: company.company_code
        },
        message: 'Código de empresa válido'
      });
      
    } catch (error) {
      console.error('Error en validateCompanyCode controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Obtener información de la empresa actual (requiere autenticación)
  async getCurrentCompany(req, res) {
    try {
      // El schema de la empresa debe estar en req.companySchema (establecido por middleware)
      if (!req.companySchema) {
        return res.status(400).json({
          success: false,
          error: 'Schema de empresa no establecido'
        });
      }
      
      const company = await companiesService.getCompanyBySchema(req.companySchema);
      
      if (!company) {
        return res.status(404).json({
          success: false,
          error: 'Empresa no encontrada'
        });
      }
      
      // Obtener límites y uso actual
      const limits = await companiesService.checkCompanyLimits(req.companySchema);
      
      res.json({
        success: true,
        data: {
          ...company,
          limits
        }
      });
      
    } catch (error) {
      console.error('Error en getCurrentCompany controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Listar todas las empresas (solo para super administradores)
  async getAllCompanies(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      
      const result = await companiesService.getAllCompanies(page, limit);
      
      res.json({
        success: true,
        data: result
      });
      
    } catch (error) {
      console.error('Error en getAllCompanies controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Actualizar empresa
  async updateCompany(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de empresa es requerido'
        });
      }
      
      const updatedCompany = await companiesService.updateCompany(id, req.body);
      
      res.json({
        success: true,
        data: updatedCompany,
        message: 'Empresa actualizada exitosamente'
      });
      
    } catch (error) {
      console.error('Error en updateCompany controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Eliminar empresa (soft delete)
  async deleteCompany(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'ID de empresa es requerido'
        });
      }
      
      const result = await companiesService.deleteCompany(id);
      
      res.json(result);
      
    } catch (error) {
      console.error('Error en deleteCompany controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Verificar límites de la empresa actual
  async checkLimits(req, res) {
    try {
      if (!req.companySchema) {
        return res.status(400).json({
          success: false,
          error: 'Schema de empresa no establecido'
        });
      }
      
      const limits = await companiesService.checkCompanyLimits(req.companySchema);
      
      res.json({
        success: true,
        data: limits
      });
      
    } catch (error) {
      console.error('Error en checkLimits controller:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new CompaniesController();
