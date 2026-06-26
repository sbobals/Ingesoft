const express = require('express');
const session = require('express-session');
const pool = require('./db');

const app = express();
const port = 3000;

const PDFDocument = require('pdfkit');
const verificarLogin = require('./middleware/auth');
const verificarRol = require('./middleware/roles');

/* =========================
   CONFIGURACIÓN
========================= */

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'proyecto-inf236',
  resave: false,
  saveUninitialized: false
}));

app.use(express.static('public'));
app.use((req, res, next) => {

  res.locals.usuario = req.session.usuario;

  next();

});
/* =========================
   RUTA PRINCIPAL (Login)
========================= */
app.get('/', (req, res) => {

  if (!req.session.usuario) {
    return res.redirect('/login');
  }

  if (req.session.usuario.rol === 'admin') {
    return res.redirect('/admin');
  }

  if (req.session.usuario.rol === 'ejecutivo') {
    return res.redirect('/ejecutivo');
  }

  if (req.session.usuario.rol === 'estudiante') {
    return res.redirect('/estudiante');
  }

  res.redirect('/login');

});

app.get('/login', (req, res) => {

  if (req.session.usuario) {
    return res.redirect('/');
  }

  res.render('login');

});

app.get('/panel', verificarLogin, (req, res) => {

  const rol = req.session.usuario.rol;

  if (rol === 'admin') {
    return res.redirect('/admin');
  }

  if (rol === 'ejecutivo') {
    return res.redirect('/ejecutivo');
  }

  if (rol === 'estudiante') {
    return res.redirect('/estudiante');
  }

  return res.redirect('/login');
});

// ── RUTA POST /login ──────────────────────────────────────────
app.post('/login', async (req, res) => {

  try {
    const { email, password } = req.body;

    const result = await pool.query(`
      SELECT *
      FROM usuarios
      WHERE email = $1
      AND password = $2
    `, [email, password]);

    // Credenciales incorrectas → volver al login con mensaje de error
    if (result.rows.length === 0) {
      return res.render('login', { error: 'Usuario o contraseña incorrecta' });
    }

    const usuario = result.rows[0];

    req.session.usuario = {
      id:            usuario.id,
      nombre:        usuario.nombre,
      rol:           usuario.rol,
      estudiante_id: usuario.estudiante_id
    };

    return res.redirect('/panel');

  } catch (err) {
    console.error(err);
    res.status(500).send('Error en login');
  }

});
app.get('/logout', (req, res) => {

  req.session.destroy(() => {
    res.redirect('/login');
  });

  
});

app.get('/admin',
  verificarLogin,
  verificarRol('admin'),
  (req,res)=>{
    res.render('admin');
  }
);

app.get('/ejecutivo',
  verificarLogin,
  verificarRol('ejecutivo'),
  (req,res)=>{
    res.render('ejecutivo');
  }
);

app.get(
  '/estudiante',
  verificarLogin,
  verificarRol('estudiante'),
  async (req, res) => {

    try {

      const estudianteId = req.session.usuario.estudiante_id;

      const result = await pool.query(`
        SELECT
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

        WHERE e.id = $1

        GROUP BY e.id
      `,[estudianteId]);

      const datos = result.rows[0];

      const saldoPendiente =
        Number(datos.deuda) -
        Number(datos.pagos) -
        Number(datos.beneficios);

      res.render('estudiante', {
        usuario: req.session.usuario,
        saldoPendiente
      });

    } catch(err){

      console.error(err);
      res.status(500).send('Error');

    }

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

// Mostrar vista
app.get('/deudas', verificarLogin, verificarRol('admin', 'ejecutivo'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT deudas.*, estudiantes.nombre
      FROM deudas
      JOIN estudiantes ON deudas.estudiante_id = estudiantes.id
      ORDER BY deudas.id DESC
    `);

    res.render('deudas', { 
      deudas: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar deudas');
  }
});

// Formulario crear
app.get('/deudas/nueva', verificarLogin, verificarRol('admin', 'ejecutivo'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM estudiantes');

    res.render('crear_deuda', {
      estudiantes: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error cargando estudiantes');
  }
});

// Crear
app.post('/deudas', verificarLogin, verificarRol('admin', 'ejecutivo'), async (req, res) => {
  try {
    const estudiante_id = Number(req.body.estudiante_id);
    const monto = Number(req.body.monto);
    const { estado, fecha_vencimiento } = req.body;

    if (!estudiante_id || !monto) {
      return res.status(400).send("Datos inválidos");
    }

    await pool.query(`
      INSERT INTO deudas (estudiante_id, monto, estado, fecha_vencimiento)
      VALUES ($1, $2, $3, $4)
    `, [estudiante_id, monto, estado, fecha_vencimiento]);

    res.redirect('/deudas');

  } catch (err) {
    console.error("ERROR CREAR:", err.message);
    res.status(500).send(err.message);
  }
});

// Mostrar editar
app.get('/deudas/editar/:id', verificarLogin, verificarRol('admin', 'ejecutivo'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM deudas WHERE id = $1
    `, [id]);

    res.render('editar_deuda', {
      deuda: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar deuda');
  }
});

// Guardar cambios
app.post('/deudas/editar/:id', verificarLogin, verificarRol('admin', 'ejecutivo'), async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, estado, fecha_vencimiento } = req.body;

    await pool.query(`
      UPDATE deudas
      SET monto = $1,
          estado = $2,
          fecha_vencimiento = $3
      WHERE id = $4
    `, [monto, estado, fecha_vencimiento, id]);

    res.redirect('/deudas'); 

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar deuda');
  }
});

// Eliminar
app.post('/deudas/eliminar/:id', 
  verificarLogin, 
  verificarRol('admin', 'ejecutivo'), 
  async (req, res) => {
    try {
      const { id } = req.params;

      await pool.query(`DELETE FROM detalle_pagos WHERE deuda_id = $1`, [id]);
      await pool.query(`DELETE FROM deudas WHERE id = $1`, [id]);

      res.redirect('/deudas');

    } catch (err) {
      console.error("ERROR ELIMINAR:", err);
      res.status(500).send('Error al eliminar deuda');
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
   BENEFICIOS POR ESTUDIANTE
========================= */
app.get(
  '/mis-beneficios',
  verificarRol('estudiante'),
  async (req, res) => {

    try {

      const estudianteId = req.session.usuario.estudiante_id;

      const beneficios = await pool.query(`
        SELECT
          tipo,
          cobertura,
          vigencia
        FROM beneficios
        WHERE estudiante_id = $1
        ORDER BY vigencia DESC
      `, [estudianteId]);

      res.render('mis-beneficios', {
        beneficios: beneficios.rows
      });

    } catch (err) {

      console.error(err);
      res.status(500).send('Error al cargar beneficios');

    }

});
/* =========================
   BENEFICIOS
========================= */
app.get('/beneficios', verificarRol('estudiante'), async (req, res) => {
  try {
    // 1. Obtenemos el ID de la estudiante conectada
    const estudianteId = req.session.usuario.estudiante_id;

    const carreras = [
      { nombre: "Ingeniería Civil Informática", arancel: 7000000 },
      { nombre: "Ingeniería Comercial", arancel: 6800000 },
      { nombre: "Arquitectura", arancel: 7000000 },
      { nombre: "Técnico Universitario en Informática", arancel: 4500000 }
    ];

    // 2. Agregamos el WHERE para filtrar solo sus beneficios
    const result = await pool.query(`
      SELECT
        beneficios.id,
        estudiantes.nombre,
        beneficios.tipo,
        beneficios.cobertura,
        TO_CHAR(beneficios.vigencia, 'YYYY-MM-DD') AS vigencia
      FROM beneficios
      JOIN estudiantes ON beneficios.estudiante_id = estudiantes.id
      WHERE beneficios.estudiante_id = $1
    `, [estudianteId]);

    res.render('beneficios', { carreras: carreras, beneficios: result.rows });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error cargando beneficios');
  }
});

/* =========================
   PALETA DE COLORES
========================= */
const COLORS = {
  primary:      '#1E3A8A',
  primaryLight: '#3B5FC0',
  danger:       '#DC2626',
  dangerBg:     '#FEF2F2',
  success:      '#16A34A',
  successBg:    '#F0FDF4',
  purple:       '#7C3AED',
  purpleBg:     '#F5F3FF',
  dark:         '#111827',
  gray:         '#6B7280',
  lightGray:    '#F9FAFB',
  border:       '#E5E7EB',
  white:        '#FFFFFF',
};
/*=================================
    PAGO EN LINEA
===================================*/
app.get('/pago_online',
  verificarLogin,
  verificarRol('estudiante'),
  async (req,res) => {
    const estudianteId =
      req.session.usuario.estudiante_id;

    const deudas = await pool.query(`
      SELECT *
      FROM deudas
      WHERE estudiante_id = $1
      AND estado = 'pendiente'
    `,[estudianteId]);

    res.render('pago_online',{
      deudas: deudas.rows
    });

});
app.post('/pagar',
verificarRol('estudiante'),
async (req,res)=>{

    let ids = req.body.deudas;

    if(!ids){
        return res.redirect('/pago_online');
    }

    if(!Array.isArray(ids)){
        ids = [ids];
    }

    await pool.query(`
      UPDATE deudas
      SET estado = 'pagada'
      WHERE id = ANY($1)
    `,[ids]);

    res.redirect('/deudas');

});
/*=================================
    CERTIFICADOS
===================================*/
app.get('/certificados',
  verificarRol('estudiante'),
  (req,res) => {

    res.render('certificados');

});
app.get('/generar-certificado',
verificarRol('estudiante'),
(req,res)=>{

    const tipo = req.query.tipo;

    switch(tipo){

        case 'alumno-regular':
            return res.redirect('/certificado/alumno-regular');

        case 'arancel-matricula':
            return res.redirect('/certificado/arancel-matricula');

        case 'seguro-practica':
            return res.redirect('/certificado/seguro-practica');

        default:
            return res.redirect('/certificados');
    }

});
/*=================================
    RESUMEN ESTUDIANTE
===================================*/
app.get(
  '/mi-resumen',
  verificarRol('estudiante'),
  async (req, res) => {
    try {
      const estudianteId = req.session.usuario.estudiante_id;

      // Parámetros de periodo para el historial de pagos (Criterio 2)
      // Formato esperado: ?desde=2024-01-01&hasta=2024-12-31
      // Si no se envían, se usa el mes en curso por defecto
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
        .toISOString().split('T')[0];
      const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const desde = req.query.desde || primerDiaMes;
      const hasta = req.query.hasta || ultimoDiaMes;

      // ── Consulta 1: Resumen financiero integrado (Criterio 1) ──────────────
      // Se hacen subqueries independientes para evitar el producto cartesiano
      // que ocurre al hacer JOIN de deudas + pagos + beneficios simultáneamente.
      const resumenResult = await pool.query(`
        SELECT
          e.id,
          e.nombre,

          COALESCE(deudas_agg.total_deuda, 0)      AS deuda,
          COALESCE(pagos_agg.total_pagos, 0)        AS pagos,
          COALESCE(beneficios_agg.total_beneficios, 0) AS beneficios,

          -- Saldo pendiente real = deuda - pagos aplicados - beneficios
          COALESCE(deudas_agg.total_deuda, 0)
            - COALESCE(pagos_agg.total_pagos, 0)
            - COALESCE(beneficios_agg.total_beneficios, 0) AS saldo_pendiente

        FROM estudiantes e

        -- Total de deudas del estudiante
        LEFT JOIN (
          SELECT estudiante_id, SUM(monto) AS total_deuda
          FROM deudas
          WHERE estudiante_id = $1
          GROUP BY estudiante_id
        ) deudas_agg ON e.id = deudas_agg.estudiante_id

        -- Total de pagos realizados del estudiante
        LEFT JOIN (
          SELECT estudiante_id, SUM(monto) AS total_pagos
          FROM pagos
          WHERE estudiante_id = $1
          GROUP BY estudiante_id
        ) pagos_agg ON e.id = pagos_agg.estudiante_id

        -- Total de cobertura por beneficios del estudiante
        LEFT JOIN (
          SELECT estudiante_id, SUM(cobertura) AS total_beneficios
          FROM beneficios
          WHERE estudiante_id = $1
          GROUP BY estudiante_id
        ) beneficios_agg ON e.id = beneficios_agg.estudiante_id

        WHERE e.id = $1
      `, [estudianteId]);

      // ── Consulta 2: Historial de pagos por periodo (Criterio 2) ───────────
      const pagosResult = await pool.query(`
        SELECT
          p.id,
          p.monto,
          p.fecha,
          p.estado,

          -- Detalle de a qué deudas se aplicó cada pago
          COALESCE(
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'deuda_id',       dp.deuda_id,
                'monto_aplicado', dp.monto_aplicado,
                'vencimiento',    d.fecha_vencimiento,
                'estado_deuda',   d.estado
              )
            ) FILTER (WHERE dp.id IS NOT NULL),
            '[]'
          ) AS detalles

        FROM pagos p

        LEFT JOIN detalle_pagos dp
          ON p.id = dp.pago_id

        LEFT JOIN deudas d
          ON dp.deuda_id = d.id

        WHERE p.estudiante_id = $1
          AND p.fecha BETWEEN $2 AND $3

        GROUP BY p.id, p.monto, p.fecha, p.estado
        ORDER BY p.fecha DESC
      `, [estudianteId, desde, hasta]);

      // ── Si el estudiante no existe en BD ──────────────────────────────────
      if (!resumenResult.rows[0]) {
        return res.status(404).send('Estudiante no encontrado');
      }

      res.render('mi-resumen', {
        estudiante: resumenResult.rows[0],
        historialPagos: pagosResult.rows,
        periodo: { desde, hasta }
      });

    } catch (err) {
      console.error(err);
      res.status(500).send('Error al cargar el resumen');
    }
  }
);
/* =========================
   RESUMEN FINANCIERO
========================= */
app.get('/resumen', async (req, res) => {
  try {
    const inicio = req.query.inicio || '2025-01-01';
    const fin    = req.query.fin    || '2026-12-31';

    const result = await pool.query(`
      SELECT
        e.id,
        e.nombre,
        COALESCE(SUM(DISTINCT d.monto),     0) AS deuda,
        COALESCE(SUM(DISTINCT p.monto),     0) AS pagos,
        COALESCE(SUM(DISTINCT b.cobertura), 0) AS beneficios
      FROM estudiantes e
      LEFT JOIN deudas d
        ON e.id = d.estudiante_id
        AND d.fecha_vencimiento BETWEEN $1 AND $2
      LEFT JOIN pagos p
        ON e.id = p.estudiante_id
        AND p.fecha BETWEEN $1 AND $2
      LEFT JOIN beneficios b
        ON e.id = b.estudiante_id
        AND b.vigencia BETWEEN $1 AND $2
      GROUP BY e.id, e.nombre
      ORDER BY e.nombre ASC
    `, [inicio, fin]);

    let totalDeuda = 0, totalPagos = 0, totalBeneficios = 0;

    result.rows.forEach(r => {
      totalDeuda      += Number(r.deuda);
      totalPagos      += Number(r.pagos);
      totalBeneficios += Number(r.beneficios);
    });

    const saldoGlobal = totalDeuda - totalPagos - totalBeneficios;

    res.render('resumen', {
      estudiantes: result.rows,
      totalDeuda,
      totalPagos,
      totalBeneficios,
      saldoGlobal,
      inicio,
      fin,
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al cargar el resumen');
  }
});

/* =========================
   HELPERS DE DIBUJO
========================= */
function drawTableRow(doc, y, cols, isEven) {
  if (isEven) {
    doc.rect(50, y - 5, 510, 22).fill('#F8FAFC');
  }
  doc.fillColor(COLORS.dark).fontSize(10).font('Helvetica');
  cols.forEach(({ text, x }) => {
    doc.text(String(text ?? '—'), x, y, { lineBreak: false });
  });
}

function drawSectionHeader(doc, title, color, bgColor) {
  const y = doc.y;
  doc.rect(50, y, 510, 36).fill(bgColor);
  doc.rect(50, y, 5, 36).fill(color);
  doc.fillColor(color).fontSize(14).font('Helvetica-Bold')
     .text(title, 65, y + 10, { lineBreak: false });
  doc.moveDown(2.5);
}

function drawTableHeader(doc, cols, color) {
  const y = doc.y;
  doc.rect(50, y, 510, 24).fill(color);
  doc.fillColor(COLORS.white).fontSize(10).font('Helvetica-Bold');
  cols.forEach(({ label, x }) => {
    doc.text(label, x, y + 7, { lineBreak: false });
  });
  doc.moveDown(1.8);
}

function drawDivider(doc, marginTop = 0.5) {
  doc.moveDown(marginTop);
  doc.moveTo(50, doc.y).lineTo(560, doc.y)
     .strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

function drawSummaryCard(doc, x, y, w, label, amount, color) {
  doc.rect(x, y, w, 62).fill(COLORS.white);
  doc.rect(x, y, w, 3).fill(color);
  doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica')
     .text(label, x + 12, y + 12, { width: w - 20, lineBreak: false });
  doc.fillColor(color).fontSize(16).font('Helvetica-Bold')
     .text(`$${Number(amount).toLocaleString('es-CL')}`, x + 12, y + 28, {
       width: w - 20, lineBreak: false,
     });
}

/* =========================
   REPORTE PDF
========================= */
app.get('/reporte/:id', async (req, res) => {
  try {
    const estudianteId = req.params.id;
    const inicio = req.query.inicio || '2025-01-01';
    const fin    = req.query.fin    || '2026-12-31';

    /* — CONSULTAR DATOS — */
    const estudiante = await pool.query(
      `SELECT * FROM estudiantes WHERE id = $1`,
      [estudianteId]
    );

    if (estudiante.rows.length === 0) {
      return res.status(404).send('Estudiante no encontrado');
    }

    const deudas = await pool.query(
      `SELECT * FROM deudas
       WHERE estudiante_id = $1
       AND fecha_vencimiento BETWEEN $2 AND $3`,
      [estudianteId, inicio, fin]
    );

    const pagos = await pool.query(
      `SELECT * FROM pagos
       WHERE estudiante_id = $1
       AND fecha BETWEEN $2 AND $3`,
      [estudianteId, inicio, fin]
    );

    const beneficios = await pool.query(
      `SELECT * FROM beneficios
       WHERE estudiante_id = $1
       AND vigencia BETWEEN $2 AND $3`,
      [estudianteId, inicio, fin]
    );

    /* — CALCULAR TOTALES — */
    const totalDeudas     = deudas.rows.reduce((acc, d) => acc + Number(d.monto), 0);
    const totalPagos      = pagos.rows.reduce((acc, p) => acc + Number(p.monto), 0);
    const totalBeneficios = beneficios.rows.reduce((acc, b) => acc + Number(b.cobertura), 0);
    const saldo           = totalDeudas - totalPagos - totalBeneficios;

    const fmtDate  = (val) => val ? new Date(val).toISOString().split('T')[0] : '—';
    const fmtMoney = (n)   => `$${Number(n).toLocaleString('es-CL')}`;

    /* — CREAR PDF — */
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=reporte-${estudianteId}.pdf`);
    doc.pipe(res);

    /* ── HEADER ── */
    doc.rect(0, 0, 612, 110).fill(COLORS.primary);
    doc.rect(0, 105, 612, 5).fill(COLORS.primaryLight);

    doc.fillColor(COLORS.white).fontSize(26).font('Helvetica-Bold')
       .text('Reporte Financiero', 50, 28, { lineBreak: false });

    doc.fillColor('rgba(255,255,255,0.7)').fontSize(10).font('Helvetica')
       .text('Sistema Financiero Estudiantil', 50, 60, { lineBreak: false });

    const fechaHoy = new Date().toLocaleDateString('es-CL', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
    doc.fillColor(COLORS.white).fontSize(10)
       .text(`Generado: ${fechaHoy}`, 350, 28, {
         width: 210, align: 'right', lineBreak: false
       });

    doc.y = 130;

    /* ── TARJETA ESTUDIANTE ── */
    doc.rect(50, doc.y, 510, 60).fill(COLORS.lightGray);
    doc.rect(50, doc.y, 3, 60).fill(COLORS.primary);

    const cardY = doc.y + 12;
    doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica')
       .text('ESTUDIANTE', 65, cardY, { lineBreak: false });
    doc.fillColor(COLORS.dark).fontSize(16).font('Helvetica-Bold')
       .text(estudiante.rows[0].nombre, 65, cardY + 14, { lineBreak: false });

    doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica')
       .text('PERÍODO', 380, cardY, { lineBreak: false });
    doc.fillColor(COLORS.dark).fontSize(11).font('Helvetica-Bold')
       .text(`${inicio}  -  ${fin}`, 380, cardY + 14, { lineBreak: false });

    doc.y = cardY + 60;
    drawDivider(doc, 0.8);

    /* ── SECCIÓN DEUDAS ── */
    drawSectionHeader(doc, '  DEUDAS', COLORS.danger, COLORS.dangerBg);
    drawTableHeader(doc, [
      { label: 'CONCEPTO / ID', x: 65  },
      { label: 'MONTO',         x: 280 },
      { label: 'ESTADO',        x: 370 },
      { label: 'VENCIMIENTO',   x: 460 },
    ], COLORS.danger);

    if (deudas.rows.length === 0) {
      doc.fillColor(COLORS.gray).fontSize(10)
         .text('Sin deudas en el período.', 65, doc.y);
      doc.moveDown();
    } else {
      deudas.rows.forEach((d, i) => {
        const y = doc.y;
        drawTableRow(doc, y, [
          { text: d.concepto || `Deuda #${d.id}`, x: 65  },
          { text: fmtMoney(d.monto),               x: 280 },
          { text: d.estado,                         x: 370 },
          { text: fmtDate(d.fecha_vencimiento),     x: 460 },
        ], i % 2 === 0);
        doc.moveDown(1.4);
      });
    }

    drawDivider(doc);

    /* ── SECCIÓN PAGOS ── */
    drawSectionHeader(doc, '  PAGOS', COLORS.success, COLORS.successBg);
    drawTableHeader(doc, [
      { label: 'REFERENCIA', x: 65  },
      { label: 'MONTO',      x: 280 },
      { label: 'FECHA',      x: 460 },
    ], COLORS.success);

    if (pagos.rows.length === 0) {
      doc.fillColor(COLORS.gray).fontSize(10)
         .text('Sin pagos en el período.', 65, doc.y);
      doc.moveDown();
    } else {
      pagos.rows.forEach((p, i) => {
        const y = doc.y;
        drawTableRow(doc, y, [
          { text: p.referencia || `Pago #${p.id}`, x: 65  },
          { text: fmtMoney(p.monto),                x: 280 },
          { text: fmtDate(p.fecha),                 x: 460 },
        ], i % 2 === 0);
        doc.moveDown(1.4);
      });
    }

    drawDivider(doc);

    /* ── SECCIÓN BENEFICIOS ── */
    drawSectionHeader(doc, '  BENEFICIOS', COLORS.purple, COLORS.purpleBg);
    drawTableHeader(doc, [
      { label: 'TIPO',      x: 65  },
      { label: 'COBERTURA', x: 280 },
      { label: 'VIGENCIA',  x: 460 },
    ], COLORS.purple);

    if (beneficios.rows.length === 0) {
      doc.fillColor(COLORS.gray).fontSize(10)
         .text('Sin beneficios en el período.', 65, doc.y);
      doc.moveDown();
    } else {
      beneficios.rows.forEach((b, i) => {
        const y = doc.y;
        drawTableRow(doc, y, [
          { text: b.tipo,                x: 65  },
          { text: fmtMoney(b.cobertura), x: 280 },
          { text: fmtDate(b.vigencia),   x: 460 },
        ], i % 2 === 0);
        doc.moveDown(1.4);
      });
    }

    doc.moveDown();

    /* ── RESUMEN FINAL ── */
    const resumenY = doc.y;
    doc.rect(50, resumenY, 510, 160).fill('#F1F5F9');

    doc.fillColor(COLORS.dark).fontSize(13).font('Helvetica-Bold')
       .text('RESUMEN FINANCIERO', 65, resumenY + 14, { lineBreak: false });

    const cW = 155, cGap = 12, cX = 57, cY = resumenY + 38;
    drawSummaryCard(doc, cX,                    cY, cW, 'Total Deudas',     totalDeudas,     COLORS.danger);
    drawSummaryCard(doc, cX + cW + cGap,        cY, cW, 'Total Pagos',      totalPagos,      COLORS.success);
    drawSummaryCard(doc, cX + (cW + cGap) * 2,  cY, cW, 'Total Beneficios', totalBeneficios, COLORS.purple);

    doc.moveTo(57, cY + 74).lineTo(553, cY + 74)
       .strokeColor(COLORS.border).lineWidth(0.5).stroke();

    const saldoColor = saldo > 0 ? COLORS.danger : COLORS.success;
    const saldoLabel = saldo > 0 ? 'Saldo Pendiente' : 'Saldo a Favor';

    doc.fillColor(COLORS.gray).fontSize(10).font('Helvetica')
       .text(saldoLabel, 65, cY + 86, { lineBreak: false });
    doc.fillColor(saldoColor).fontSize(22).font('Helvetica-Bold')
       .text(fmtMoney(Math.abs(saldo)), 65, cY + 100, { lineBreak: false });

    /* ── FOOTER ── */
    doc.rect(0, 792, 612, 50).fill(COLORS.primary);
    doc.fillColor('rgba(255,255,255,0.6)').fontSize(9).font('Helvetica')
       .text(
         'Sistema Financiero Estudiantil  ·  Documento generado automáticamente  ·  Confidencial',
         50, 802, { align: 'center', width: 512 }
       );

    /* — FINALIZAR — */
    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al generar el PDF');
  }
});
/* =========================
   REPORTE GLOBAL PDF
========================= */
app.get('/reporte-global', async (req, res) => {
  try {
    const inicio = req.query.inicio || '2025-01-01';
    const fin    = req.query.fin    || '2026-12-31';

    /* — CONSULTAR DATOS — */
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(d.monto),      0) AS total_deudas,
        COALESCE(SUM(p.monto),      0) AS total_pagos,
        COALESCE(SUM(b.cobertura),  0) AS total_beneficios,
        COUNT(DISTINCT e.id)           AS total_estudiantes
      FROM estudiantes e
      LEFT JOIN deudas d
        ON e.id = d.estudiante_id
        AND d.fecha_vencimiento BETWEEN $1 AND $2
      LEFT JOIN pagos p
        ON e.id = p.estudiante_id
        AND p.fecha BETWEEN $1 AND $2
      LEFT JOIN beneficios b
        ON e.id = b.estudiante_id
        AND b.vigencia BETWEEN $1 AND $2
    `, [inicio, fin]);

    const data  = result.rows[0];
    const saldo = Number(data.total_deudas) - Number(data.total_pagos) - Number(data.total_beneficios);

    const fmtMoney = (n) => `$${Number(n).toLocaleString('es-CL')}`;
    const fechaHoy = new Date().toLocaleDateString('es-CL', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    /* — CREAR PDF — */
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=reporte-global.pdf');
    doc.pipe(res);

    /* ── HEADER ── */
    doc.rect(0, 0, 612, 110).fill(COLORS.primary);
    doc.rect(0, 105, 612, 5).fill(COLORS.primaryLight);

    doc.fillColor(COLORS.white).fontSize(26).font('Helvetica-Bold')
       .text('Reporte Financiero Global', 50, 28, { lineBreak: false });

    doc.fillColor('rgba(255,255,255,0.7)').fontSize(10).font('Helvetica')
       .text('Sistema Financiero Estudiantil', 50, 60, { lineBreak: false });

    doc.fillColor(COLORS.white).fontSize(10)
       .text(`Generado: ${fechaHoy}`, 350, 28, {
         width: 210, align: 'right', lineBreak: false
       });

    doc.y = 130;

    /* ── TARJETA PERÍODO ── */
    doc.rect(50, doc.y, 510, 60).fill(COLORS.lightGray);
    doc.rect(50, doc.y, 3, 60).fill(COLORS.primary);

    const cardY = doc.y + 12;

    doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica')
       .text('PERÍODO ANALIZADO', 65, cardY, { lineBreak: false });
    doc.fillColor(COLORS.dark).fontSize(16).font('Helvetica-Bold')
       .text(`${inicio}  -  ${fin}`, 65, cardY + 14, { lineBreak: false });

    doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica')
       .text('TOTAL ESTUDIANTES', 380, cardY, { lineBreak: false });
    doc.fillColor(COLORS.dark).fontSize(16).font('Helvetica-Bold')
       .text(String(data.total_estudiantes), 380, cardY + 14, { lineBreak: false });

    doc.y = cardY + 72;
    drawDivider(doc, 0.5);

    /* ── TARJETAS DE MÉTRICAS (3 columnas) ── */
    const metrics = [
      { label: 'Total Deudas',     value: fmtMoney(data.total_deudas),     color: COLORS.danger  },
      { label: 'Total Pagos',      value: fmtMoney(data.total_pagos),      color: COLORS.success },
      { label: 'Total Beneficios', value: fmtMoney(data.total_beneficios), color: COLORS.purple  },
    ];

    const mW = 155, mGap = 12, mX = 57, mY = doc.y + 10;

    metrics.forEach((m, i) => {
      const x = mX + i * (mW + mGap);
      doc.rect(x, mY, mW, 80).fill(COLORS.white);
      doc.rect(x, mY, mW, 4).fill(m.color);

      doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica')
         .text(m.label.toUpperCase(), x + 12, mY + 14, { width: mW - 20, lineBreak: false });

      doc.fillColor(m.color).fontSize(18).font('Helvetica-Bold')
         .text(m.value, x + 12, mY + 32, { width: mW - 20, lineBreak: false });
    });

    doc.y = mY + 96;
    drawDivider(doc, 0.2);

    /* ── GRÁFICO DE BARRAS VISUAL ── */
    const maxVal = Math.max(
      Number(data.total_deudas),
      Number(data.total_pagos),
      Number(data.total_beneficios),
      1
    );

    const barMaxH  = 100;
    const barW     = 80;
    const barGap   = 55;
    const barBaseX = 110;

    // Título PRIMERO
    doc.fillColor(COLORS.dark).fontSize(13).font('Helvetica-Bold')
      .text('Distribución Visual', 50, doc.y);

    doc.moveDown(1);

    // barBaseY se calcula DESPUÉS de mover el cursor
    const barBaseY = doc.y + barMaxH + 10;

    const bars = [
      { label: 'Deudas',     value: Number(data.total_deudas),     color: COLORS.danger  },
      { label: 'Pagos',      value: Number(data.total_pagos),       color: COLORS.success },
      { label: 'Beneficios', value: Number(data.total_beneficios),  color: COLORS.purple  },
    ];

    bars.forEach((bar, i) => {
      const x  = barBaseX + i * (barW + barGap);
      const h  = Math.max((bar.value / maxVal) * barMaxH, 4);
      const by = barBaseY - h;

      doc.rect(x + 3, by + 3, barW, h).fill('#E2E8F0');
      doc.rect(x, by, barW, h).fill(bar.color);

      doc.fillColor(COLORS.dark).fontSize(9).font('Helvetica-Bold')
        .text(fmtMoney(bar.value), x, by - 16, { width: barW, align: 'center', lineBreak: false });

      doc.fillColor(COLORS.gray).fontSize(9).font('Helvetica')
        .text(bar.label, x, barBaseY + 6, { width: barW, align: 'center', lineBreak: false });
    });

    doc.moveTo(barBaseX - 10, barBaseY)
      .lineTo(barBaseX + bars.length * (barW + barGap) - barGap + 10, barBaseY)
      .strokeColor(COLORS.border).lineWidth(1).stroke();

    doc.y = barBaseY + 30;
    drawDivider(doc, 0.5);

    /* ── SALDO GLOBAL DESTACADO ── */
    const saldoColor = saldo > 0 ? COLORS.danger : COLORS.success;
    const saldoLabel = saldo > 0 ? 'Saldo Pendiente Global' : 'Saldo a Favor Global';
    const saldoBg    = saldo > 0 ? COLORS.dangerBg : COLORS.successBg;

    const saldoY = doc.y + 10;
    doc.rect(50, saldoY, 510, 80).fill(saldoBg);
    doc.rect(50, saldoY, 5, 80).fill(saldoColor);

    doc.fillColor(COLORS.gray).fontSize(10).font('Helvetica')
       .text(saldoLabel, 70, saldoY + 16, { lineBreak: false });

    doc.fillColor(saldoColor).fontSize(32).font('Helvetica-Bold')
       .text(fmtMoney(Math.abs(saldo)), 70, saldoY + 32, { lineBreak: false });

    /* ── FOOTER ── */
    doc.rect(0, 792, 612, 50).fill(COLORS.primary);
    doc.fillColor('rgba(255,255,255,0.6)').fontSize(9).font('Helvetica')
       .text(
         'Sistema Financiero Estudiantil  ·  Documento generado automáticamente  ·  Confidencial',
         50, 802, { align: 'center', width: 512 }
       );

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).send('Error al generar el PDF');
  }
});
/* =========================
   HISTORIAL FINANCIERO
========================= */
app.get('/mi-historial',verificarRol('estudiante'),(req, res) => {
    const estudianteId = req.session.usuario.estudiante_id;
    res.redirect(`/historial/${estudianteId}`);
  }
);
app.get('/historial/:id', async (req, res) => {
	try {
		const estudianteId = req.params.id;

		const { year, semester } = req.query; 

		let queryText = `
	    SELECT 
		detalle_historico.id, 
		cobertura AS monto_beneficio, 
		deudas.monto AS monto_deuda, 
		pagos.monto AS monto_pago,
		detalle_historico.ano,
		detalle_historico.semestre
	    FROM 
		detalle_historico
	    INNER JOIN beneficios ON beneficios.estudiante_id = detalle_historico.id
	    INNER JOIN deudas ON deudas.estudiante_id = detalle_historico.id
	    INNER JOIN pagos ON pagos.estudiante_id = detalle_historico.id
	    WHERE detalle_historico.id = $1
	`;

		const queryParams = [estudianteId];

		if (year && semester) {
			queryText += ` AND detalle_historico.ano = $2 AND detalle_historico.semestre = $3`;
			queryParams.push(Number(year), Number(semester));
		}

		const estudiante = await pool.query(queryText, queryParams);

		if (year && semester) {
			console.log(`Filtrado por Año: ${year}, Semestre: ${semester}`);
		} else {
			console.log("Mostrando todo el historial por defecto");
		}

		res.render('historial', {
			estudiantes: estudiante.rows,
			estudianteId: estudianteId
		});

	} catch (err) {
		console.error(err);
		res.status(500).send('Error obteniendo historial');
	}
});
app.get('/historial/:year/:semester', async (req, res) => {
	res.status(500).send('Pan con pate');
})

/* =========================
   SERVIDOR
========================= */
app.listen(port, () => {

  console.log(`Servidor corriendo en http://localhost:${port}`);

});
