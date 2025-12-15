const express = require('express');
const router = express.Router();
const db = require('../models/db');
const generarPDF = require('../utils/generarPDF');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

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

// GET: Equipos dañados
router.get('/equipos-danados', requireLogin, requireRole(['tecnico']), (req, res) => {
  db.query('SELECT * FROM equipos WHERE estado = "dañado"', (err, results) => {
    if (err) return res.status(500).send('Error al obtener equipos dañados');
    res.json(results);
  });
});

// POST: Registrar mantenimiento
router.post('/registrar/:id', requireLogin, requireRole(['tecnico']), (req, res) => {
  const equipoId = req.params.id;
  const tecnicoId = req.session.user.id;
  const { tipo_mantenimiento, descripcion } = req.body;

  const query = `
    INSERT INTO reportes_mantenimiento (equipo_id, tecnico_id, tipo_mantenimiento, descripcion)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [equipoId, tecnicoId, tipo_mantenimiento, descripcion], (err) => {
    if (err) return res.status(500).send('Error al registrar mantenimiento');
    res.send('Mantenimiento registrado, pendiente de cerrar');
  });
});

// POST: Crear nuevo reporte (SOLO técnico)
router.post('/crear', requireLogin, requireRole(['tecnico']), (req, res) => {
  const { equipo_id, tipo_mantenimiento, descripcion } = req.body;

  // El tecnico_id es el ID del usuario logueado
  const tecnico_id = req.session.user.id;

  const query = `
    INSERT INTO reportes_mantenimiento
    (equipo_id, tecnico_id, tipo_mantenimiento, descripcion)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [equipo_id, tecnico_id, tipo_mantenimiento, descripcion], (err) => {
    if (err) {
      console.error('Error al guardar reporte:', err);
      return res.status(500).send('Error al guardar el reporte');
    }

    // Redirige correctamente al historial
    res.redirect('/historial.html?equipo=' + equipo_id);
  });
});


// POST: Cerrar reporte y generar PDF
router.post('/cerrar-reporte/:id', requireLogin, requireRole(['tecnico']), (req, res) => {
  const reporteId = req.params.id;

  const queryDatos = `
    SELECT r.*, e.nombre_equipo, e.codigo_interno, t.nombre AS tecnico
    FROM reportes_mantenimiento r
    JOIN equipos e ON r.equipo_id = e.id
    JOIN tecnicos t ON r.tecnico_id = t.id
    WHERE r.id = ?
  `;

  db.query(queryDatos, [reporteId], (err, result) => {
    if (err || result.length === 0) return res.status(500).send('Error al obtener datos del reporte');

    const datos = result[0];
    const nombreArchivo = `reporte_${datos.codigo_interno}_${Date.now()}.pdf`;
    const rutaArchivo = path.join(__dirname, '../uploads', nombreArchivo);

    generarPDF(datos, rutaArchivo, () => {
      const cerrarQuery = `
        UPDATE reportes_mantenimiento
        SET estado_reporte = 'cerrado', archivo_pdf = ?
        WHERE id = ?
      `;

      const actualizarEquipo = `UPDATE equipos SET estado = 'activo' WHERE id = ?`;

      db.query(cerrarQuery, [nombreArchivo, reporteId], (err) => {
        if (err) return res.status(500).send('Error al cerrar el reporte');
        db.query(actualizarEquipo, [datos.equipo_id], (err2) => {
          if (err2) return res.status(500).send('Error al actualizar equipo');
          res.send('Reporte cerrado y PDF generado correctamente');
        });
      });
    });
  });
});

// GET: TODOS los reportes por equipo (✅ CORREGIDO)
router.get('/todos/:equipoId', requireLogin, requireRole(['tecnico', 'admin']), (req, res) => {
  const { equipoId } = req.params;

  const query = `
    SELECT r.id, r.tipo_mantenimiento, r.descripcion, r.fecha_reporte,
           r.archivo_pdf, r.estado_reporte,
           t.nombre AS tecnico
    FROM reportes_mantenimiento r
    JOIN tecnicos t ON r.tecnico_id = t.id
    WHERE r.equipo_id = ?
    ORDER BY r.fecha_reporte DESC
  `;

  db.query(query, [equipoId], (err, results) => {
    if (err) {
      console.error('Error historial:', err);
      return res.status(500).send('Error al obtener historial');
    }
    res.json(results);
  });
});

// GET: PDF historial
router.get('/historial-pdf/:equipoId', requireLogin, requireRole(['tecnico', 'admin']), async (req, res) => {
  const { equipoId } = req.params;

  try {
    const [equipoDatos] = await db.promise().query(
      'SELECT nombre_equipo, codigo_interno FROM equipos WHERE id = ?', [equipoId]
    );

    if (equipoDatos.length === 0) {
      return res.status(404).send('Equipo no encontrado');
    }

    const equipo = equipoDatos[0];

    const [reportes] = await db.promise().query(`
      SELECT r.*, t.nombre AS tecnico
      FROM reportes_mantenimiento r
      JOIN tecnicos t ON r.tecnico_id = t.id
      WHERE r.equipo_id = ?
      ORDER BY r.fecha_reporte DESC
    `, [equipoId]);

    const doc = new PDFDocument({ margin: 40 });

    res.setHeader('Content-Disposition', `attachment; filename=historial_${equipo.codigo_interno}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');

    doc.pipe(res);

    doc.fontSize(18).text('Historial de Mantenimiento', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Equipo: ${equipo.nombre_equipo} (${equipo.codigo_interno})`, { align: 'center' });
    doc.moveDown();

    reportes.forEach((r, i) => {
      doc.fontSize(11).text(`Reporte ${i + 1}`, { underline: true });
      doc.fontSize(10).text(`Fecha: ${new Date(r.fecha_reporte).toLocaleString()}`);
      doc.text(`Técnico: ${r.tecnico}`);
      doc.text(`Tipo: ${r.tipo_mantenimiento}`);
      doc.text(`Descripción: ${r.descripcion}`);
      doc.text(`Estado: ${r.estado_reporte}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error('Error al generar historial PDF:', err);
    res.status(500).send('Error al generar historial PDF');
  }
});

module.exports = router;

