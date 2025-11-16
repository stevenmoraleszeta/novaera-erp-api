const usersService = require('../services/usersService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await usersService.getUserWithRoles(email);
    if (!user) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    
    // Verificar que el usuario esté activo
    if (!user.is_active) {
      return res.status(403).json({ error: 'Tu cuenta está inactiva. Contacta al administrador para activarla.' });
    }
    
    // Verificar que el usuario no esté bloqueado
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Tu cuenta está bloqueada. Contacta al administrador.' });
    }
    
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        roles: user.roles,
        is_active: user.is_active,
        is_blocked: user.is_blocked 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: true, // siempre true en producción para cross-domain
      sameSite: 'none', // necesario para cookies cross-domain en HTTPS
      path: '/',
      maxAge: 8 * 60 * 60 * 1000 // 8 horas
    });
    
    // Verificar si el usuario es administrador basándose en sus roles
    const isAdmin = user.rolesWithDetails?.some(role => role.is_admin === true) || false;
    
    res.json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        roles: user.roles,
        rolesWithDetails: user.rolesWithDetails || [],
        is_admin: isAdmin,
        is_active: user.is_active,
        is_blocked: user.is_blocked,
        last_login: user.last_login,
        avatar_url: user.avatar_url
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.me = async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario siga activo en la base de datos
    const user = await usersService.getUserByEmail(decoded.email);
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    if (!user.is_active) {
      return res.status(403).json({ error: 'Tu cuenta está inactiva. Contacta al administrador.' });
    }
    
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Tu cuenta está bloqueada. Contacta al administrador.' });
    }
    
    // Obtener roles completos del usuario para verificar is_admin
    const rolesWithDetails = await usersService.getUserRolesWithDetails(user.id);
    const isAdmin = rolesWithDetails?.some(role => role.is_admin === true) || false;
    
    res.json({ 
      id: decoded.id, 
      name: decoded.name, 
      email: decoded.email, 
      roles: decoded.roles || [],
      rolesWithDetails: rolesWithDetails || [],
      is_admin: isAdmin,
      is_active: user.is_active,
      is_blocked: user.is_blocked,
      last_login: user.last_login,
      avatar_url: user.avatar_url
    });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
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
