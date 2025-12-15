const PDFDocument = require('pdfkit');
const fs = require('fs');

function generarPDF(datos, rutaArchivo, callback) {
  const doc = new PDFDocument();

  // Guardar en la ruta especificada
  const stream = fs.createWriteStream(rutaArchivo);
  doc.pipe(stream);

  // Título
  doc.fontSize(20).text('Reporte de Mantenimiento', { align: 'center' });
  doc.moveDown();

  // Información del equipo
  doc.fontSize(12).text(`Fecha del reporte: ${new Date(datos.fecha_reporte).toLocaleString()}`);
  doc.text(`Técnico responsable: ${datos.tecnico}`);
  doc.text(`Código interno: ${datos.codigo_interno}`);
  doc.text(`Nombre del equipo: ${datos.nombre_equipo}`);
  doc.text(`Tipo de mantenimiento: ${datos.tipo_mantenimiento}`);
  doc.moveDown();

  // Descripción del problema
  doc.font('Helvetica-Bold').text('Descripción del problema y mantenimiento realizado:');
  doc.font('Helvetica').text(datos.descripcion, { align: 'justify' });

  doc.end();

  // Esperar a que termine de escribir el archivo
  stream.on('finish', () => {
    console.log(`PDF generado en: ${rutaArchivo}`);
    if (callback) callback();
  });
}

module.exports = generarPDF;
