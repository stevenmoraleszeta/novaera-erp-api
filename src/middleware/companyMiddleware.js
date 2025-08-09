const companiesService = require('../services/companiesService');

/**
 * Middleware para establecer el schema de empresa en las solicitudes autenticadas
 * Este middleware debe ejecutarse DESPUÉS del authMiddleware
 */
const companySchemaMiddleware = async (req, res, next) => {
  try {
    // Solo aplicar si el usuario está autenticado
    if (!req.user) {
      return next();
    }
    
    // Obtener el código de empresa desde diferentes fuentes
    let companyCode = null;
    
    // 1. Desde el header (recomendado)
    if (req.headers['x-company-code']) {
      companyCode = req.headers['x-company-code'];
    }
    // 2. Desde el token JWT (si se almacena ahí)
    else if (req.user.company_code) {
      companyCode = req.user.company_code;
    }
    // 3. Desde query params (para casos especiales)
    else if (req.query.company_code) {
      companyCode = req.query.company_code;
    }
    
    if (!companyCode) {
      return res.status(400).json({
        success: false,
        error: 'Código de empresa requerido',
        code: 'COMPANY_CODE_REQUIRED'
      });
    }
    
    // Obtener información de la empresa
    const company = await companiesService.getCompanyByCode(companyCode);
    
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Empresa no encontrada',
        code: 'COMPANY_NOT_FOUND'
      });
    }
    
    if (!company.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Empresa inactiva',
        code: 'COMPANY_INACTIVE'
      });
    }
    
    // Validar el schema
    const validation = await companiesService.validateSchema(company.schema_name);
    if (!validation.valid) {
      return res.status(500).json({
        success: false,
        error: validation.error,
        code: 'SCHEMA_INVALID'
      });
    }
    
    // Establecer información de la empresa en el request
    req.company = company;
    req.companySchema = company.schema_name;
    req.companyCode = company.company_code;
    
    next();
    
  } catch (error) {
    console.error('Error en companySchemaMiddleware:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno al procesar empresa',
      code: 'COMPANY_MIDDLEWARE_ERROR'
    });
  }
};

/**
 * Middleware para obtener conexión de base de datos con schema configurado
 * Este middleware establece req.dbClient con el schema correcto
 */
const companyDatabaseMiddleware = async (req, res, next) => {
  try {
    // Solo aplicar si hay schema de empresa establecido
    if (!req.companySchema) {
      return next();
    }
    
    // Obtener conexión con schema configurado
    const client = await companiesService.getCompanyConnection(req.companySchema);
    
    // Establecer cliente en el request
    req.dbClient = client;
    
    // Middleware para liberar la conexión al finalizar
    const originalSend = res.send;
    res.send = function(data) {
      if (req.dbClient) {
        req.dbClient.release();
        req.dbClient = null;
      }
      originalSend.call(this, data);
    };
    
    // También liberar en caso de error
    const originalJson = res.json;
    res.json = function(data) {
      if (req.dbClient) {
        req.dbClient.release();
        req.dbClient = null;
      }
      originalJson.call(this, data);
    };
    
    next();
    
  } catch (error) {
    console.error('Error en companyDatabaseMiddleware:', error);
    
    // Liberar conexión si hay error
    if (req.dbClient) {
      req.dbClient.release();
      req.dbClient = null;
    }
    
    res.status(500).json({
      success: false,
      error: 'Error al conectar con base de datos de empresa',
      code: 'DATABASE_CONNECTION_ERROR'
    });
  }
};

/**
 * Middleware para verificar límites de empresa antes de operaciones
 */
const checkCompanyLimitsMiddleware = (operation = 'general') => {
  return async (req, res, next) => {
    try {
      if (!req.companySchema) {
        return next();
      }
      
      const limits = await companiesService.checkCompanyLimits(req.companySchema);
      
      // Verificar límites según el tipo de operación
      switch (operation) {
        case 'create_user':
          if (limits.users.available <= 0) {
            return res.status(403).json({
              success: false,
              error: 'Límite de usuarios alcanzado',
              code: 'USER_LIMIT_EXCEEDED',
              data: limits.users
            });
          }
          break;
          
        case 'upload_file':
          // Verificar si hay espacio suficiente (ejemplo: 10MB por archivo)
          const fileSize = req.headers['content-length'] || 0;
          const fileSizeMB = Math.ceil(fileSize / (1024 * 1024));
          
          if (limits.storage.available_mb < fileSizeMB) {
            return res.status(403).json({
              success: false,
              error: 'Límite de almacenamiento alcanzado',
              code: 'STORAGE_LIMIT_EXCEEDED',
              data: limits.storage
            });
          }
          break;
      }
      
      // Establecer límites en el request para referencia
      req.companyLimits = limits;
      
      next();
      
    } catch (error) {
      console.error('Error en checkCompanyLimitsMiddleware:', error);
      next(); // Continuar aunque haya error en verificación de límites
    }
  };
};

/**
 * Middleware combinado que aplica schema y conexión de DB
 */
const companyMiddleware = [
  companySchemaMiddleware,
  companyDatabaseMiddleware
];

module.exports = {
  companySchemaMiddleware,
  companyDatabaseMiddleware,
  checkCompanyLimitsMiddleware,
  companyMiddleware
};
