const express = require('express');
const pool = require('./db');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

/* =========================
   RUTA PRINCIPAL
========================= */
app.get('/', (req, res) => {

  res.sendFile(__dirname + '/views/home.html');

});

/* =========================
   VER ESTUDIANTES
========================= */
app.get('/estudiantes', async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT * FROM estudiantes
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).send('Error obteniendo estudiantes');
  }
});

/* =========================
   VER DEUDAS
========================= */
app.get('/deudas', async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        deudas.id,
        estudiantes.nombre,
        deudas.monto,
        deudas.estado,
        deudas.fecha_vencimiento
      FROM deudas
      JOIN estudiantes
      ON deudas.estudiante_id = estudiantes.id
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).send('Error obteniendo deudas');
  }
});

/* =========================
   VER PAGOS
========================= */
app.get('/pagos', async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        pagos.id,
        estudiantes.nombre,
        pagos.monto,
        pagos.fecha,
        pagos.estado
      FROM pagos
      JOIN estudiantes
      ON pagos.estudiante_id = estudiantes.id
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).send('Error obteniendo pagos');
  }
});

/* =========================
   VER BENEFICIOS
========================= */
app.get('/beneficios', async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        beneficios.id,
        estudiantes.nombre,
        beneficios.tipo,
        beneficios.cobertura,
        beneficios.vigencia
      FROM beneficios
      JOIN estudiantes
      ON beneficios.estudiante_id = estudiantes.id
    `);

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).send('Error obteniendo beneficios');
  }
});

/* =========================
   RESUMEN FINANCIERO
========================= */
app.get('/resumen', async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        e.nombre,

        COALESCE(SUM(DISTINCT d.monto),0) AS deuda,

        COALESCE(SUM(DISTINCT p.monto),0) AS pagos,

        COALESCE(SUM(DISTINCT b.cobertura),0) AS beneficios

      FROM estudiantes e

      LEFT JOIN deudas d
      ON e.id = d.estudiante_id

      LEFT JOIN pagos p
      ON e.id = p.estudiante_id

      LEFT JOIN beneficios b
      ON e.id = b.estudiante_id

      GROUP BY e.nombre
    `);

    let cards = '';

    result.rows.forEach(r => {

      const saldo =
        r.deuda - r.pagos - r.beneficios;

      cards += `
        <div class="card">

          <h2>${r.nombre}</h2>

          <p>Deuda: $${r.deuda}</p>

          <p>Pagos: $${r.pagos}</p>

          <p>Beneficios: $${r.beneficios}</p>

          <hr>

          <h3>Saldo: $${saldo}</h3>

        </div>
      `;
    });

    res.send(`
      <html>

      <head>

        <title>Resumen Financiero</title>

        <link rel="stylesheet" href="/style.css">

      </head>

      <body>

        <h1>Dashboard Financiero</h1>

        <div class="container">

          ${cards}

        </div>

      </body>

      </html>
    `);

  } catch (err) {

    console.error(err);

    res.status(500).send('Error');

  }
});
/* =========================
   HISTORIAL FINANCIERO
========================= */
app.get('/historial/:id', async (req, res) => {

  try {

    const estudianteId = req.params.id;

    const estudiante = await pool.query(`
      SELECT * FROM estudiantes
      WHERE id = $1
    `, [estudianteId]);

    const deudas = await pool.query(`
      SELECT * FROM deudas
      WHERE estudiante_id = $1
    `, [estudianteId]);

    const pagos = await pool.query(`
      SELECT * FROM pagos
      WHERE estudiante_id = $1
    `, [estudianteId]);

    const beneficios = await pool.query(`
      SELECT * FROM beneficios
      WHERE estudiante_id = $1
    `, [estudianteId]);

    res.json({
      estudiante: estudiante.rows[0],
      deudas: deudas.rows,
      pagos: pagos.rows,
      beneficios: beneficios.rows
    });

  } catch (err) {

    console.error(err);

    res.status(500).send('Error obteniendo historial');
  }
});

/* =========================
   SERVIDOR
========================= */
app.listen(port, () => {

  console.log(`Servidor corriendo en http://localhost:${port}`);

});