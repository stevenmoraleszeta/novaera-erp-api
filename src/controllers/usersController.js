const usersService = require('../services/usersService');

exports.getUsers = async (req, res) => {
  try {
    const users = await usersService.getUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await usersService.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const userData = req.body;
    const user = await usersService.createUser(userData);
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const result = await usersService.updateUser({ id, name, email });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password_hash } = req.body;
    const result = await usersService.updatePassword({ id, password_hash });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo } = req.query; // 'logica' o 'fisica'
    const result = await usersService.deleteUser(id, tipo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await usersService.blockUser(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await usersService.unblockUser(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const result = await usersService.setActiveStatus(id, activo);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.resetPasswordAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { password_hash } = req.body;
    const result = await usersService.resetPasswordAdmin(id, password_hash);
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