require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Conexión a la base de datos
const db = require('./models/db');

// Importar controladores
const usuariosController = require('./controllers/usuariosController');
const equiposController = require('./controllers/equiposController');
const mantenimientoController = require('./controllers/mantenimientoController');

// Importar rutas de técnicos y médicos
const tecnicosRoutes = require('./routes/tecnicos');
const medicosRoutes = require('./routes/medicos');

// Middleware de body-parser y JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Configurar sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'clave_secreta_default',
  resave: false,
  saveUninitialized: false
}));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Usar rutas (después de configurar sesión)
app.use('/tecnicos', tecnicosRoutes);
app.use('/medicos', medicosRoutes);
app.use('/', usuariosController);
app.use('/equipos', equiposController);
app.use('/mantenimiento', mantenimientoController);

// Ruta raíz
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

