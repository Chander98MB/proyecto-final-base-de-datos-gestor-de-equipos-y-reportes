const express = require('express');
const router = express.Router();
const db = require('../models/db');

// Middleware para proteger rutas
function requireLogin(req, res, next) {
  if (!req.session.user) return res.status(401).send('No autenticado');
  next();
}

// Middleware por rol
function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.session.user.tipo_usuario)) {
      return res.status(403).send('Acceso denegado');
    }
    next();
  };
}

// POST: Agregar nuevo equipo (solo admin)
router.post('/agregar', requireLogin, requireRole(['admin']), (req, res) => {
  const { nombre_equipo, tipo_equipo } = req.body;

  // Generar código interno automáticamente
  db.query('SELECT COUNT(*) AS total FROM equipos', (err, result) => {
    if (err) return res.status(500).send('Error generando código');

    const numero = result[0].total + 1;
    const codigo_interno = `EQP-${numero.toString().padStart(4, '0')}`;

    const query = `
      INSERT INTO equipos (codigo_interno, nombre_equipo, tipo_equipo)
      VALUES (?, ?, ?)
    `;
    db.query(query, [codigo_interno, nombre_equipo, tipo_equipo], (err) => {
      if (err) return res.status(500).send('Error al agregar equipo');
      res.send('Equipo agregado correctamente');
    });
  });
});

// GET: Listar todos los equipos
router.get('/listado', requireLogin, (req, res) => {
  db.query('SELECT * FROM equipos', (err, results) => {
    if (err) return res.status(500).send('Error al obtener equipos');
    res.json(results);
  });
});

// POST: Reportar equipo dañado (solo médico)
router.post('/reportar-dano/:id', requireLogin, requireRole(['medico']), (req, res) => {
  const id = req.params.id;
  const query = 'UPDATE equipos SET estado = "dañado" WHERE id = ?';

  db.query(query, [id], (err) => {
    if (err) return res.status(500).send('Error al reportar daño');
    res.send('Equipo marcado como dañado');
  });
});

// GET: Buscar por tipo o estado (con filtros)
router.get('/buscar', requireLogin, (req, res) => {
  const { tipo, estado } = req.query;
  let sql = 'SELECT * FROM equipos WHERE 1=1';
  const params = [];

  if (tipo) {
    sql += ' AND tipo_equipo = ?';
    params.push(tipo);
  }

  if (estado) {
    sql += ' AND estado = ?';
    params.push(estado);
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).send('Error en la búsqueda');
    res.json(results);
  });
});

// GET: Obtener detalles de un equipo por ID (nombre y código)
router.get('/detalle/:id', requireLogin, (req, res) => {
  const id = req.params.id;
  db.query('SELECT nombre_equipo, codigo_interno FROM equipos WHERE id = ?', [id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }
    res.json(results[0]);
  });
});

/**
 * ✅ NUEVO: Eliminar equipo (solo admin)
 * - Para NO romper nada: si el equipo tiene reportes en reportes_mantenimiento, NO se elimina.
 */
router.post('/eliminar', requireLogin, requireRole(['admin']), (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).send('Falta id');

  // 1) Verificar si existen reportes asociados (evita error por llave foránea y evita perder historial)
  db.query(
    'SELECT COUNT(*) AS total FROM reportes_mantenimiento WHERE equipo_id = ?',
    [id],
    (err, rows) => {
      if (err) return res.status(500).send('Error al verificar reportes');

      /*
      const total = rows[0].total;
      if (total > 0) {
        return res
          .status(409)
          .send('No se puede eliminar: el equipo tiene reportes de mantenimiento asociados.');
      }
      */

      // 2) Si no hay reportes, eliminar el equipo
      db.query('DELETE FROM equipos WHERE id = ?', [id], (err2) => {
        if (err2) return res.status(500).send('Error al eliminar equipo');
        res.send('Equipo eliminado correctamente');
      });
    }
  );
});

module.exports = router;


