const express = require('express');
const router = express.Router();
const db = require('../models/db');
const bcrypt = require('bcrypt');

// Middleware
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).send('No autenticado');
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.user.tipo_usuario !== 'admin') return res.status(403).send('Acceso denegado');
  next();
}

// Registrar médico en `usuarios` y `medicos`
router.post('/agregar', requireLogin, requireAdmin, (req, res) => {
  const { nombre_usuario, password, especialidad } = req.body;

  if (!nombre_usuario || !password || !especialidad) {
    return res.status(400).send('Faltan datos');
  }

  const password_hash = bcrypt.hashSync(password, 10);

  // Insertar en `usuarios`
  const insertUsuario = 'INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario) VALUES (?, ?, "medico")';
  db.query(insertUsuario, [nombre_usuario, password_hash], (err) => {
    if (err) return res.status(500).send('Error al registrar en usuarios');

    // Insertar en `medicos`
    const insertMedico = 'INSERT INTO medicos (nombre, especialidad) VALUES (?, ?)';
    db.query(insertMedico, [nombre_usuario, especialidad], (err2) => {
      if (err2) return res.status(500).send('Error al registrar médico');
      res.redirect('/usuarios.html');
    });
  });
});

module.exports = router;


