const express = require('express');
const pool = require('./db');

const app = express();
const port = 3000;

app.use(express.json());

/* =========================
   INICIALIZAR TABLAS
========================= */
app.get('/init', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deudas (
        id SERIAL PRIMARY KEY,
        monto INT,
        estado TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pagos (
        id SERIAL PRIMARY KEY,
        monto INT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS beneficios (
        id SERIAL PRIMARY KEY,
        monto INT
      )
    `);

    res.send('Tablas creadas correctamente');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear tablas');
  }
});

/* =========================
   CREAR DATOS DE PRUEBA
========================= */
app.get('/seed', async (req, res) => {
  try {
    await pool.query(`INSERT INTO deudas (monto, estado) VALUES (50000, 'pendiente')`);
    await pool.query(`INSERT INTO deudas (monto, estado) VALUES (30000, 'pendiente')`);

    await pool.query(`INSERT INTO pagos (monto) VALUES (20000)`);

    await pool.query(`INSERT INTO beneficios (monto) VALUES (10000)`);

    res.send('Datos de prueba insertados');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al insertar datos');
  }
});

/* =========================
   VER DEUDAS
========================= */
app.get('/deudas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deudas');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

/* =========================
   VER PAGOS
========================= */
app.get('/pagos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pagos');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

/* =========================
   VER BENEFICIOS
========================= */
app.get('/beneficios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM beneficios');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

/* =========================
   ESTADO FINANCIERO
========================= */
app.get('/estado-financiero', async (req, res) => {
  try {
    const deuda = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM deudas');
    const pagos = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM pagos');
    const beneficios = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM beneficios');

    const deudaTotal = deuda.rows[0].total;
    const pagosTotal = pagos.rows[0].total;
    const beneficiosTotal = beneficios.rows[0].total;

    const saldo = deudaTotal - pagosTotal - beneficiosTotal;

    res.send(`
      <html>
        <head>
          <title>Estado Financiero</title>
          <style>
            body {
              font-family: Arial;
              background: #f4f6f8;
              text-align: center;
            }
            .card {
              background: white;
              padding: 20px;
              margin: 20px auto;
              width: 300px;
              border-radius: 10px;
              box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
            }
            p {
              font-size: 18px;
            }
          </style>
        </head>
        <body>
          <h1>Estado Financiero</h1>

          <div class="card">
            <p>Deuda: $${deudaTotal}</p>
            <p>Pagos: $${pagosTotal}</p>
            <p>Beneficios: $${beneficiosTotal}</p>
            <hr>
            <h2>Saldo: $${saldo}</h2>
          </div>
        </body>
      </html>
    `);

  } catch (err) {
    res.status(500).send('Error');
  }
});
/* =========================
   RESUMEN FINANCIERO
========================= */
app.get('/resumen', async (req, res) => {
  try {
    const deuda = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM deudas');
    const pagos = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM pagos');
    const beneficios = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM beneficios');

    const totalDeuda = Number(deuda.rows[0].total);
    const totalPagos = Number(pagos.rows[0].total);
    const totalBeneficios = Number(beneficios.rows[0].total);

    const saldo = totalDeuda - totalPagos - totalBeneficios;

    const estado = saldo > 0 ? "DEUDA PENDIENTE" : "SALDO A FAVOR";

    res.send(`
      <html>
        <head>
          <title>Dashboard Financiero</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: linear-gradient(135deg, #eef2f7, #dfe9f3);
              margin: 0;
              padding: 0;
              text-align: center;
            }

            h1 {
              margin-top: 30px;
              color: #2c3e50;
            }

            .container {
              display: flex;
              justify-content: center;
              flex-wrap: wrap;
              margin-top: 40px;
              gap: 20px;
            }

            .card {
              background: white;
              width: 220px;
              padding: 20px;
              border-radius: 12px;
              box-shadow: 0 6px 15px rgba(0,0,0,0.1);
            }

            .title {
              font-size: 14px;
              color: #7f8c8d;
            }

            .value {
              font-size: 22px;
              font-weight: bold;
              margin-top: 10px;
            }

            .saldo {
              margin-top: 40px;
              font-size: 28px;
              font-weight: bold;
              color: ${saldo > 0 ? '#e74c3c' : '#27ae60'};
            }

            .estado {
              font-size: 18px;
              margin-top: 10px;
              color: #34495e;
            }

            .footer {
              margin-top: 40px;
              font-size: 12px;
              color: #95a5a6;
            }
          </style>
        </head>

        <body>
          <h1>📊 Dashboard Financiero Estudiantil</h1>

          <div class="container">
            <div class="card">
              <div class="title">Deudas Totales</div>
              <div class="value">$${totalDeuda}</div>
            </div>

            <div class="card">
              <div class="title">Pagos Totales</div>
              <div class="value">$${totalPagos}</div>
            </div>

            <div class="card">
              <div class="title">Beneficios</div>
              <div class="value">$${totalBeneficios}</div>
            </div>
          </div>
          <div class="footer">
            Sistema de Transparencia Financiera - Demo
          </div>
        </body>
      </html>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error en dashboard');
  }
});

/* =========================
   PROYECCIÓN FINANCIERA
========================= */
app.get('/proyeccion', async (req, res) => {
  try {
    const deuda = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM deudas');
    const pagos = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM pagos');
    const beneficios = await pool.query('SELECT COALESCE(SUM(monto),0) AS total FROM beneficios');

    const saldoFuturo =
      parseInt(deuda.rows[0].total) -
      parseInt(pagos.rows[0].total) -
      parseInt(beneficios.rows[0].total);

    res.json({
      saldoFuturo,
      periodo: "3 meses"
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error');
  }
});

/* =========================
   RUTA PRINCIPAL
========================= */
app.get('/', (req, res) => {
  res.send(`
    <h1>Sistema de Transparencia Financiera</h1>
    <p>Endpoints disponibles:</p>
    <ul>
      <li>/init</li>
      <li>/seed</li>
      <li>/deudas</li>
      <li>/pagos</li>
      <li>/beneficios</li>
      <li>/estado-financiero</li>
      <li>/proyeccion</li>
      <li>/resumen</li>
    </ul>
  `);
});

/* =========================
   SERVIDOR
========================= */
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});