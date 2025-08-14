const usersService = require('../services/usersService');

exports.getUsers = async (req, res) => {
  try {
    // Usar el schema de la empresa del middleware
    const users = await usersService.getUsers(req.companySchema);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const userData = req.body;
    // Usar el schema de la empresa del middleware
    const user = await usersService.createUser(userData, req.companySchema);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const result = await usersService.updateUser({ id, name, email }, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password_hash, password } = req.body; // soportar password plano
    const result = await usersService.updatePassword({ id, password_hash, password }, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo } = req.query; // 'logica' o 'fisica'
    const result = await usersService.deleteUser(id, tipo, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await usersService.blockUser(id, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await usersService.unblockUser(id, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const result = await usersService.setActiveStatus(id, activo, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPasswordAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { password_hash, password } = req.body;
    let finalHash = password_hash;
    if (!finalHash && password) {
      // Hash local para admin reset reutilizando service hashing simplificado (evita doble hash)
      const bcrypt = require('bcryptjs');
      finalHash = await bcrypt.hash(password, 10);
    }
    if (!finalHash) return res.status(400).json({ error: 'Password requerido' });
    const result = await usersService.resetPasswordAdmin(id, finalHash, req.companySchema);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.existsByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    const exists = await usersService.existsByEmail(email);
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setAvatar = async (req, res) => {
  try {
    const { id } = req.params;
    const { avatar_url } = req.body;
    const result = await usersService.setAvatar(id, avatar_url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};