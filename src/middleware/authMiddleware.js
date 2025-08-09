const jwt = require('jsonwebtoken');
const companiesService = require('../services/companiesService');
require('dotenv').config();

module.exports = function (req, res, next) {
  // Leer token desde cookies (consistente con login/me/logout)
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    
    // Establecer usuario en request
    req.user = user;
    
    // Si el token incluye company_code, validarlo
    if (user.company_code) {
      try {
        const company = await companiesService.getCompanyByCode(user.company_code);
        if (!company || !company.is_active) {
          return res.status(403).json({ 
            error: 'Empresa inválida o inactiva',
            code: 'INVALID_COMPANY' 
          });
        }
        
        // Establecer información de empresa en el request
        req.company = company;
        req.companySchema = company.schema_name;
        req.companyCode = company.company_code;
      } catch (error) {
        console.error('Error validando empresa en token:', error);
        return res.status(500).json({ 
          error: 'Error al validar empresa',
          code: 'COMPANY_VALIDATION_ERROR' 
        });
      }
    }
    
    next();
  });
};