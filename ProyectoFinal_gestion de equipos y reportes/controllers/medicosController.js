const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Middleware de autenticación
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).send('No autenticado');
  next();
}

// Solo el admin puede agregar médicos
function requireAdmin(req, res, next) {
  if (req.session.user.tipo_usuario !== 'admin') return res.status(403).send('Acceso denegado');
  next();
}

// POST: Agregar médico
router.post('/agregar', requireLogin, requireAdmin, (req, res) => {
  const { nombre, password } = req.body;
  if (!nombre || !password) return res.status(400).send('Faltan datos');

  const bcrypt = require('bcrypt');
  const password_hash = bcrypt.hashSync(password, 10);

  const query = 'INSERT INTO medicos (nombre,especialidad) VALUES (?, ?)';
  db.query(query, [nombre, especialidad], (err) => {
    if (err) return res.status(500).send('Error al registrar médico');
    res.send('Médico registrado correctamente');
  });
});
// GET: Listar todos los equipos
router.get('/listado', requireLogin, (req, res) => {
  db.query('SELECT * FROM medicos', (err, results) => {
    if (err) return res.status(500).send('Error al obtener equipos');
    res.json(results);
  });
});