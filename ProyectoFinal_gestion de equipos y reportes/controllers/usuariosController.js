// === BASE ORIGINAL DEL PROYECTO (NO MODIFICAR) ===
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../models/db');
const path = require('path');

// Middleware
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).send('No autenticado');
  next();
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.session.user.tipo_usuario)) {
      return res.status(403).send('Acceso denegado');
    }
    next();
  };
}

// ===== LOGIN / REGISTRO (SIN CAMBIOS) =====
router.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/registro.html'));
});

router.post('/registro', (req, res) => {
  const { nombre_usuario, password, codigo_acceso } = req.body;
  const buscarCodigo = 'SELECT tipo_usuario FROM codigos_acceso WHERE codigo = ?';

  db.query(buscarCodigo, [codigo_acceso], (err, results) => {
    if (err || results.length === 0) return res.send('❌ Código inválido');
    const hash = bcrypt.hashSync(password, 10);

    db.query(
      'INSERT INTO usuarios (nombre_usuario, password_hash, tipo_usuario) VALUES (?, ?, ?)',
      [nombre_usuario, hash, results[0].tipo_usuario],
      err => {
        if (err) return res.send('❌ Error al registrar');
        res.redirect('/login.html');
      }
    );
  });
});

router.post('/login', (req, res) => {
  const { nombre_usuario, password } = req.body;
  db.query('SELECT * FROM usuarios WHERE nombre_usuario = ?', [nombre_usuario], (err, results) => {
    if (err || results.length === 0) return res.send('❌ Usuario no encontrado');

    const user = results[0];
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.send('❌ Contraseña incorrecta');
    }

    req.session.user = {
      id: user.id,
      nombre_usuario: user.nombre_usuario,
      tipo_usuario: user.tipo_usuario
    };

    res.redirect('/');
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

router.get('/tipo-usuario', (req, res) => {
  if (!req.session.user) return res.status(401).json({});
  res.json({ tipo_usuario: req.session.user.tipo_usuario });
});

// ===== LISTADO DE USUARIOS (ADMIN) =====
router.get('/usuarios/listado', (req, res) => {
  if (!req.session.user || req.session.user.tipo_usuario !== 'admin') {
    return res.status(403).json({});
  }

  db.query('SELECT id, nombre_usuario, tipo_usuario FROM usuarios', (err, results) => {
    if (err) return res.status(500).json({});
    res.json(results);
  });
});

// ===== CAMBIAR ROL (YA EXISTÍA) =====
router.post('/usuarios/cambiar-rol', (req, res) => {
  if (!req.session.user || req.session.user.tipo_usuario !== 'admin') {
    return res.status(403).json({});
  }

  const { id, tipo_usuario } = req.body;
  db.query(
    'UPDATE usuarios SET tipo_usuario = ? WHERE id = ?',
    [tipo_usuario, id],
    err => {
      if (err) return res.status(500).json({});
      res.json({ ok: true });
    }
  );
});

// === INICIO NUEVA RUTA: ELIMINAR USUARIO ===
router.post('/usuarios/eliminar', (req, res) => {
  if (!req.session.user || req.session.user.tipo_usuario !== 'admin') {
    return res.status(403).json({});
  }

  const { id } = req.body;

  db.query('DELETE FROM usuarios WHERE id = ?', [id], err => {
    if (err) return res.status(500).json({});
    res.json({ ok: true });
  });
});
// === FIN NUEVA RUTA ===

module.exports = router;


