const usersService = require('../services/usersService');
const companiesService = require('../services/companiesService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

exports.login = async (req, res) => {
  const { email, password, company_code } = req.body;
  
  try {
    // Validar que se proporcione el código de empresa
    if (!company_code) {
      return res.status(400).json({ 
        error: 'Código de empresa requerido',
        code: 'COMPANY_CODE_REQUIRED' 
      });
    }
    
    // Validar empresa
    const company = await companiesService.getCompanyByCode(company_code);
    if (!company) {
      return res.status(404).json({ 
        error: 'Código de empresa inválido',
        code: 'INVALID_COMPANY_CODE' 
      });
    }
    
    if (!company.is_active) {
      return res.status(403).json({ 
        error: 'La empresa está inactiva',
        code: 'COMPANY_INACTIVE' 
      });
    }
    
    // Obtener conexión con el schema de la empresa
    const client = await companiesService.getCompanyConnection(company.schema_name);
    
    try {
      // Buscar usuario en el schema de la empresa
      const result = await client.query(`
        SELECT u.*, array_agg(r.name) as role_names
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.email = $1
        GROUP BY u.id, u.name, u.email, u.password_hash, u.is_active, u.is_blocked, u.last_login, u.avatar_url
      `, [email]);
      
      const user = result.rows[0];
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Usuario o contraseña incorrectos',
          code: 'INVALID_CREDENTIALS' 
        });
      }
      
      // Verificar que el usuario esté activo
      if (!user.is_active) {
        return res.status(403).json({ 
          error: 'Tu cuenta está inactiva. Contacta al administrador para activarla.',
          code: 'USER_INACTIVE' 
        });
      }
      
      // Verificar que el usuario no esté bloqueado
      if (user.is_blocked) {
        return res.status(403).json({ 
          error: 'Tu cuenta está bloqueada. Contacta al administrador.',
          code: 'USER_BLOCKED' 
        });
      }
      
      // Verificar contraseña
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ 
          error: 'Usuario o contraseña incorrectos',
          code: 'INVALID_CREDENTIALS' 
        });
      }
      
      // Actualizar último login
      await client.query(`
        UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1
      `, [user.id]);
      
      // Crear token incluyendo información de la empresa
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          roles: user.role_names.filter(role => role !== null),
          is_active: user.is_active,
          is_blocked: user.is_blocked,
          company_code: company.company_code,
          company_id: company.id,
          schema_name: company.schema_name
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 8 * 60 * 60 * 1000 // 8 horas
      });
      
      res.json({ 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          roles: user.role_names.filter(role => role !== null),
          is_active: user.is_active,
          is_blocked: user.is_blocked,
          last_login: user.last_login,
          avatar_url: user.avatar_url,
          company: {
            id: company.id,
            code: company.company_code,
            name: company.company_name
          }
        } 
      });
      
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR' 
    });
  }
};

exports.me = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Si no hay información de empresa en el token, el usuario debe hacer login nuevamente
    if (!decoded.company_code || !decoded.schema_name) {
      return res.status(401).json({ 
        error: 'Token sin información de empresa. Inicia sesión nuevamente.',
        code: 'COMPANY_INFO_MISSING' 
      });
    }
    
    // Validar que la empresa siga activa
    const company = await companiesService.getCompanyByCode(decoded.company_code);
    if (!company || !company.is_active) {
      return res.status(403).json({ 
        error: 'Empresa inválida o inactiva',
        code: 'COMPANY_INVALID' 
      });
    }
    
    // Obtener conexión con el schema de la empresa
    const client = await companiesService.getCompanyConnection(company.schema_name);
    
    try {
      // Verificar que el usuario siga activo en la base de datos de la empresa
      const result = await client.query(`
        SELECT u.*, array_agg(r.name) as role_names
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1
        GROUP BY u.id, u.name, u.email, u.password_hash, u.is_active, u.is_blocked, u.last_login, u.avatar_url
      `, [decoded.id]);
      
      const user = result.rows[0];
      
      if (!user) {
        return res.status(401).json({ 
          error: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND' 
        });
      }
      
      if (!user.is_active) {
        return res.status(403).json({ 
          error: 'Tu cuenta está inactiva. Contacta al administrador.',
          code: 'USER_INACTIVE' 
        });
      }
      
      if (user.is_blocked) {
        return res.status(403).json({ 
          error: 'Tu cuenta está bloqueada. Contacta al administrador.',
          code: 'USER_BLOCKED' 
        });
      }
      
      res.json({ 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        roles: user.role_names.filter(role => role !== null),
        is_active: user.is_active,
        is_blocked: user.is_blocked,
        last_login: user.last_login,
        avatar_url: user.avatar_url,
        company: {
          id: company.id,
          code: company.company_code,
          name: company.company_name
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Error en me:', err);
    return res.status(401).json({ 
      error: 'Token inválido o expirado',
      code: 'INVALID_TOKEN' 
    });
  }
};

exports.logout = (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: true, 
    sameSite: 'none', 
    path: '/',
    expires: new Date(0)
  });
  res.json({ message: 'Sesión cerrada' });
};

exports.register = async (req, res) => {
  const { name, email, password, roles } = req.body;
  try {
    const existing = await usersService.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await usersService.createUser({
      name,
      email,
      password_hash,
      roles: roles || ['user']
    });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, roles: user.roles } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
