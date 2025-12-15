const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Middleware de autenticación
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).send('No autenticado');
  next();
}

// Solo el admin puede agregar técnicos
function requireAdmin(req, res, next) {
  if (req.session.user.tipo_usuario !== 'admin') {
    return res.send(`
          <link rel="stylesheet" href="/styles.css">
          <h2> Acceso denegado </h2>
          <a href="/index.html"><button class="btn-regresar">Volver al inicio</button></a>
    `);
  }
  next();
}

// POST: Agregar técnico (CORREGIDO)
router.post('/agregar', requireLogin, requireAdmin, (req, res) => {
  const { nombre_usuario, password } = req.body;
  if (!nombre_usuario || !password) {
    return res.status(400).send('Faltan datos');
  }

  const bcrypt = require('bcrypt');
  const password_hash = bcrypt.hashSync(password, 10);

  // 1. Insertar en usuarios
  const queryUsuario = `
    INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario)
    VALUES (?, ?, 'tecnico')
  `;

  db.query(queryUsuario, [nombre_usuario, password_hash], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error al registrar técnico');
    }

    // 2. Obtener el ID recién creado
    const nuevoTecnicoId = result.insertId;

    // 3. Insertar TAMBIÉN en tecnicos con el MISMO ID
    const queryTecnico = `
      INSERT INTO tecnicos (id, nombre, especialidad)
      VALUES (?, ?, 'General')
    `;

    db.query(queryTecnico, [nuevoTecnicoId, nombre_usuario], (err2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).send('Error al crear registro del técnico');
      }

      res.send('Técnico registrado correctamente');
    });
  });
});

module.exports = router;
