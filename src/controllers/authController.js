const usersService = require('../services/usersService');
const companiesService = require('../services/companiesService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Nuevo flujo de login: solo email y password.
// Devuelve lista de compañías donde existe el usuario.
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos', code: 'MISSING_CREDENTIALS' });
    }

    // Obtener todas las compañías activas
    const allCompanies = await companiesService.getAllActiveCompaniesBasic();

    const companiesForUser = [];
    let firstUserData = null;
    let passwordValidated = false;

    // Iterar sobre cada company y buscar usuario por email
    for (const company of allCompanies) {
      let client;
      try {
        client = await companiesService.getCompanyConnection(company.schema_name);
        const result = await client.query(`
          SELECT u.*, array_agg(r.name) as role_names
          FROM users u
          LEFT JOIN user_roles ur ON u.id = ur.user_id
          LEFT JOIN roles r ON ur.role_id = r.id
          WHERE u.email = $1
          GROUP BY u.id, u.name, u.email, u.password_hash, u.is_active, u.is_blocked, u.last_login, u.avatar_url
        `, [email]);
        const user = result.rows[0];
        if (!user) continue; // Usuario no existe en este schema

        // Validar contraseña solo una vez (la primera coincidencia)
        if (!passwordValidated) {
          const valid = await bcrypt.compare(password, user.password_hash);
            if (!valid) {
              return res.status(401).json({ error: 'Usuario o contraseña incorrectos', code: 'INVALID_CREDENTIALS' });
            }
          passwordValidated = true;
        }

        // Verificaciones de estado por cada empresa
        if (!user.is_active || user.is_blocked) {
          // Si está inactivo/bloqueado en esta empresa, se omite de la lista pero no corta proceso
          continue;
        }

        // Guardar primer userData para respuesta general
        if (!firstUserData) {
          firstUserData = {
            name: user.name,
            email: user.email,
            avatar_url: user.avatar_url
          };
        }

        companiesForUser.push({
          company_id: company.id,
          company_code: company.company_code,
            company_name: company.company_name,
            schema_name: company.schema_name,
            user_id: user.id,
            roles: user.role_names.filter(r => r)
        });
      } catch (err) {
        console.error('Error consultando empresa', company.company_code, err.message);
      } finally {
        if (client) client.release();
      }
    }

    if (!passwordValidated) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos', code: 'INVALID_CREDENTIALS' });
    }

    if (companiesForUser.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a ninguna empresa activa', code: 'NO_COMPANIES' });
    }

    // Generar token temporal SIN company info (solo para seleccionar luego)
    const tempToken = jwt.sign({
      email: email,
      name: firstUserData?.name,
      type: 'pre-company'
    }, process.env.JWT_SECRET, { expiresIn: '30m' });

    res.cookie('token', tempToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 30 * 60 * 1000
    });

    res.json({
      user: firstUserData,
      companies: companiesForUser
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  }
};

// Seleccionar compañía (recibe company_code) y emite token final
exports.selectCompany = async (req, res) => {
  const { company_code } = req.body;
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ error: 'No autenticado', code: 'NO_TOKEN' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'pre-company' || !decoded.email) {
      return res.status(400).json({ error: 'Token no válido para selección de empresa', code: 'INVALID_STAGE' });
    }

    const company = await companiesService.getCompanyByCode(company_code);
    if (!company) return res.status(404).json({ error: 'Empresa no encontrada', code: 'COMPANY_NOT_FOUND' });
    if (!company.is_active) return res.status(403).json({ error: 'Empresa inactiva', code: 'COMPANY_INACTIVE' });

    // Verificar usuario dentro del schema seleccionado
    const client = await companiesService.getCompanyConnection(company.schema_name);
    try {
      const result = await client.query(`
        SELECT u.*, array_agg(r.name) as role_names
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.email = $1 AND u.is_active = true AND u.is_blocked = false
        GROUP BY u.id, u.name, u.email, u.password_hash, u.is_active, u.is_blocked, u.last_login, u.avatar_url
      `, [decoded.email]);
      const user = result.rows[0];
      if (!user) return res.status(403).json({ error: 'Sin acceso a esta empresa', code: 'NO_ACCESS' });

      await client.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

      const finalToken = jwt.sign({
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.role_names.filter(r => r),
        is_active: user.is_active,
        is_blocked: user.is_blocked,
        company_code: company.company_code,
        company_id: company.id,
        schema_name: company.schema_name
      }, process.env.JWT_SECRET, { expiresIn: '8h' });

      res.cookie('token', finalToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 8 * 60 * 60 * 1000
      });

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.role_names.filter(r => r),
          is_active: user.is_active,
          is_blocked: user.is_blocked,
          last_login: user.last_login,
          avatar_url: user.avatar_url,
          company: {
            id: company.id,
            code: company.company_code,
            name: company.company_name,
            schema_name: company.schema_name
          }
        }
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error en selectCompany:', err);
    return res.status(500).json({ error: 'Error al seleccionar empresa', code: 'SELECT_ERROR' });
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

// Registrar empresa (atajo vía /auth) – opcional, delega en companiesService
exports.registerCompany = async (req, res) => {
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

    if (!company_name || !email) {
      return res.status(400).json({ error: 'Nombre de empresa y email son requeridos' });
    }
    if ((admin_name || admin_email) && !admin_password) {
      return res.status(400).json({ error: 'Contraseña de administrador requerida' });
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
    console.error('Error en registerCompany:', error);
    res.status(500).json({ error: error.message || 'Error al registrar empresa' });
  }
};
