const PDFDocument = require('pdfkit');
const pool = require('../db');

const MAPA_TIPOS_CERTIFICADO = {
  'alumno-regular': 'Certificado de Alumno Regular',
  'Certificado de Alumno Regular': 'Certificado de Alumno Regular',
  'arancel-matricula': 'Certificado de Arancel y Matrícula',
  'Certificado de Arancel y Matrícula': 'Certificado de Arancel y Matrícula',
  'seguro-practica': 'Seguro de Práctica',
  'Seguro de Práctica': 'Seguro de Práctica',
  'no-deuda': 'Certificado de No Deuda Financiera',
  'Certificado de No Deuda Financiera': 'Certificado de No Deuda Financiera'
};

// RS4: Mostrar formulario de solicitud de certificado
async function mostrarFormularioSolicitud(req, res) {
  try {
    const estudianteId = req.session.usuario.estudiante_id;

    const mensaje = req.session.mensaje || null;
    delete req.session.mensaje;

    const result = await pool.query(
      `SELECT id, tipo_certificado, motivo, estado, observacion, fecha_solicitud, fecha_resolucion
       FROM solicitudes
       WHERE estudiante_id = $1
       ORDER BY fecha_solicitud DESC, id DESC`,
      [estudianteId]
    );

    res.render('certificados', {
      solicitudes: result.rows,
      mensaje
    });
  } catch (err) {
    console.error('Error al cargar vista de certificados:', err);
    res.status(500).send('Error al cargar el formulario de certificados');
  }
}

// RS4: Crear nueva solicitud de certificado con estado inicial 'PENDIENTE'
async function crearSolicitud(req, res) {
  try {
    const estudianteId = req.session.usuario.estudiante_id;
    const tipoSeleccionado = (req.body.tipo_certificado || req.body.tipo || '').trim();
    const motivo = (req.body.motivo || '').trim();

    const tipoCertificado = MAPA_TIPOS_CERTIFICADO[tipoSeleccionado];

    if (!tipoCertificado) {
      req.session.mensaje = {
        tipo: 'error',
        texto: '❌ Debes seleccionar un tipo de certificado válido.'
      };
      return res.redirect('/certificados');
    }

    if (!motivo || motivo.length < 3) {
      req.session.mensaje = {
        tipo: 'error',
        texto: '❌ Debes ingresar un motivo válido para tu solicitud.'
      };
      return res.redirect('/certificados');
    }

    await pool.query(
      `INSERT INTO solicitudes (estudiante_id, tipo_certificado, motivo, estado)
       VALUES ($1, $2, $3, 'PENDIENTE')`,
      [estudianteId, tipoCertificado, motivo]
    );

    req.session.mensaje = {
      tipo: 'success',
      texto: '✅ Solicitud registrada exitosamente con estado PENDIENTE.'
    };

    return res.redirect('/mis-solicitudes');
  } catch (err) {
    console.error('Error al crear solicitud de certificado:', err);
    req.session.mensaje = {
      tipo: 'error',
      texto: '❌ Ocurrió un error al registrar tu solicitud. Intenta nuevamente.'
    };
    return res.redirect('/certificados');
  }
}

// RS6 y RS8: Consultar listado histórico, estado y notificaciones de resolución de solicitudes del estudiante
async function listarMisSolicitudes(req, res) {
  try {
    const estudianteId = req.session.usuario.estudiante_id;

    const mensaje = req.session.mensaje || null;
    delete req.session.mensaje;

    const result = await pool.query(
      `SELECT
         s.id,
         s.estudiante_id,
         s.tipo_certificado,
         s.motivo,
         s.estado,
         s.observacion,
         s.fecha_solicitud,
         s.fecha_resolucion,
         s.ejecutivo_id,
         u.nombre AS ejecutivo_nombre
       FROM solicitudes s
       LEFT JOIN usuarios u ON s.ejecutivo_id = u.id
       WHERE s.estudiante_id = $1
       ORDER BY s.fecha_solicitud DESC, s.id DESC`,
      [estudianteId]
    );

    const solicitudes = result.rows;
    const notificacionesResolucion = solicitudes.filter(
      s => s.estado === 'APROBADA' || s.estado === 'RECHAZADA'
    );

    res.render('mis-solicitudes', {
      solicitudes,
      notificacionesResolucion,
      mensaje
    });
  } catch (err) {
    console.error('Error al consultar estado de solicitudes:', err);
    res.status(500).send('Error al cargar el historial de solicitudes');
  }
}

// RS7 y RS5: Mostrar dashboard del Ejecutivo con contador, notificación y bandeja de resolución rápida
async function mostrarDashboardEjecutivo(req, res) {
  try {
    const mensaje = req.session.mensaje || null;
    delete req.session.mensaje;

    const conteoResult = await pool.query(
      `SELECT COUNT(*)::INT AS pendientes
       FROM solicitudes
       WHERE estado = 'PENDIENTE'`
    );

    const ultimasResult = await pool.query(
      `SELECT s.id, s.tipo_certificado, s.motivo, s.estado, s.fecha_solicitud, e.nombre AS estudiante_nombre
       FROM solicitudes s
       JOIN estudiantes e ON s.estudiante_id = e.id
       WHERE s.estado = 'PENDIENTE'
       ORDER BY s.fecha_solicitud DESC, s.id DESC`
    );

    const solicitudesPendientes = conteoResult.rows[0] ? conteoResult.rows[0].pendientes : 0;

    res.render('ejecutivo', {
      solicitudesPendientes,
      ultimasPendientes: ultimasResult.rows,
      mensaje
    });
  } catch (err) {
    console.error('Error al cargar panel ejecutivo:', err);
    res.render('ejecutivo', {
      solicitudesPendientes: 0,
      ultimasPendientes: [],
      mensaje: null
    });
  }
}

// RS5: Mostrar bandeja completa de gestión de solicitudes para el Ejecutivo
async function listarSolicitudesEjecutivo(req, res) {
  try {
    const mensaje = req.session.mensaje || null;
    delete req.session.mensaje;

    const result = await pool.query(
      `SELECT
         s.id,
         s.estudiante_id,
         s.tipo_certificado,
         s.motivo,
         s.estado,
         s.observacion,
         s.fecha_solicitud,
         s.fecha_resolucion,
         s.ejecutivo_id,
         e.nombre AS estudiante_nombre,
         u.nombre AS ejecutivo_nombre
       FROM solicitudes s
       JOIN estudiantes e ON s.estudiante_id = e.id
       LEFT JOIN usuarios u ON s.ejecutivo_id = u.id
       ORDER BY
         CASE WHEN s.estado = 'PENDIENTE' THEN 0 ELSE 1 END,
         s.fecha_solicitud DESC,
         s.id DESC`
    );

    const solicitudes = result.rows;
    const pendientesCount = solicitudes.filter(s => s.estado === 'PENDIENTE').length;

    res.render('ejecutivo_solicitudes', {
      solicitudes,
      solicitudesPendientes: pendientesCount,
      mensaje
    });
  } catch (err) {
    console.error('Error al listar solicitudes para ejecutivo:', err);
    res.status(500).send('Error al cargar la bandeja de solicitudes');
  }
}

// RS5: Resolver una solicitud pendiente (APROBADA o RECHAZADA)
async function resolverSolicitud(req, res) {
  try {
    const solicitudId = Number(req.params.id);
    const ejecutivoId = req.session.usuario.id;
    const estadoNuevo = (req.body.estado || '').trim().toUpperCase();
    const observacion = (req.body.observacion || '').trim();
    const origen = req.body.origen === 'dashboard' ? '/ejecutivo' : '/ejecutivo/solicitudes';

    if (!solicitudId || Number.isNaN(solicitudId)) {
      req.session.mensaje = {
        tipo: 'error',
        texto: 'ID de solicitud inválido.'
      };
      return res.redirect(origen);
    }

    if (estadoNuevo !== 'APROBADA' && estadoNuevo !== 'RECHAZADA') {
      req.session.mensaje = {
        tipo: 'error',
        texto: 'Debe seleccionar un estado de resolución válido (APROBADA o RECHAZADA).'
      };
      return res.redirect(origen);
    }

    // Validación crítica RS5: observación obligatoria al rechazar
    if (estadoNuevo === 'RECHAZADA' && observacion === '') {
      req.session.mensaje = {
        tipo: 'error',
        texto: 'Debe ingresar una observación justificando el rechazo de la solicitud'
      };
      return res.redirect(origen);
    }

    const checkResult = await pool.query(
      `SELECT id, estado FROM solicitudes WHERE id = $1`,
      [solicitudId]
    );

    if (checkResult.rows.length === 0) {
      req.session.mensaje = {
        tipo: 'error',
        texto: 'La solicitud indicada no existe.'
      };
      return res.redirect(origen);
    }

    await pool.query(
      `UPDATE solicitudes
       SET estado = $1,
           observacion = $2,
           fecha_resolucion = CURRENT_TIMESTAMP,
           ejecutivo_id = $3
       WHERE id = $4`,
      [
        estadoNuevo,
        observacion !== '' ? observacion : null,
        ejecutivoId,
        solicitudId
      ]
    );

    req.session.mensaje = {
      tipo: 'success',
      texto: `✅ Solicitud #${solicitudId} resuelta exitosamente con estado ${estadoNuevo}.`
    };

    return res.redirect(origen);
  } catch (err) {
    console.error('Error al resolver solicitud:', err);
    req.session.mensaje = {
      tipo: 'error',
      texto: 'Ocurrió un error al guardar la resolución de la solicitud.'
    };
    return res.redirect('/ejecutivo/solicitudes');
  }
}

// RS9: Descargar certificado dinámico en PDF con PDFKit (solo si está APROBADA y pertenece al estudiante)
async function descargarCertificado(req, res) {
  try {
    const solicitudId = Number(req.params.id);
    const estudianteSesionId = Number(req.session.usuario.estudiante_id);

    if (!solicitudId || Number.isNaN(solicitudId)) {
      return res.status(400).send('El certificado no se encuentra disponible para descarga');
    }

    const solResult = await pool.query(
      `SELECT
         s.*,
         e.nombre AS estudiante_nombre,
         u_est.email AS estudiante_email,
         u_ejec.nombre AS ejecutivo_nombre
       FROM solicitudes s
       JOIN estudiantes e ON s.estudiante_id = e.id
       LEFT JOIN usuarios u_est ON u_est.estudiante_id = e.id AND u_est.rol = 'estudiante'
       LEFT JOIN usuarios u_ejec ON s.ejecutivo_id = u_ejec.id
       WHERE s.id = $1`,
      [solicitudId]
    );

    if (solResult.rows.length === 0) {
      return res.status(404).send('Solicitud de certificado no encontrada');
    }

    const solicitud = solResult.rows[0];

    // Seguridad de propiedad: verificar que la solicitud pertenezca al estudiante en sesión
    if (Number(solicitud.estudiante_id) !== estudianteSesionId) {
      return res.status(403).send('Acceso denegado: no tienes permisos para descargar este certificado');
    }

    // Validación de estado obligatoria (RS9)
    if (solicitud.estado !== 'APROBADA') {
      return res.status(400).send('El certificado no se encuentra disponible para descarga');
    }

    // Consultar datos reales de la situación financiera del estudiante en PostgreSQL
    const [arancelesRes, beneficiosRes, deudasRes, pagosRes] = await Promise.all([
      pool.query(
        `SELECT periodo, monto_total FROM aranceles WHERE estudiante_id = $1 ORDER BY id DESC`,
        [estudianteSesionId]
      ),
      pool.query(
        `SELECT tipo, cobertura, vigencia FROM beneficios WHERE estudiante_id = $1 ORDER BY vigencia DESC`,
        [estudianteSesionId]
      ),
      pool.query(
        `SELECT id, descripcion, monto, estado, fecha_vencimiento FROM deudas WHERE estudiante_id = $1 ORDER BY id ASC`,
        [estudianteSesionId]
      ),
      pool.query(
        `SELECT id, monto, fecha, estado FROM pagos WHERE estudiante_id = $1 ORDER BY fecha DESC`,
        [estudianteSesionId]
      )
    ]);

    const aranceles = arancelesRes.rows;
    const beneficios = beneficiosRes.rows;
    const deudas = deudasRes.rows;
    const pagos = pagosRes.rows;

    const totalAranceles = aranceles.reduce((acc, a) => acc + Number(a.monto_total || 0), 0);
    const totalDeudas = deudas.reduce((acc, d) => acc + Number(d.monto || 0), 0);
    const totalDeudasVigentes = deudas
      .filter(d => (d.estado || '').toLowerCase() === 'pendiente')
      .reduce((acc, d) => acc + Number(d.monto || 0), 0);
    const totalBeneficios = beneficios.reduce((acc, b) => acc + Number(b.cobertura || 0), 0);
    const totalPagos = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const saldoNeto = Math.max(0, totalDeudas - totalPagos - totalBeneficios);

    const fmtMoney = (monto) => `$${Number(monto || 0).toLocaleString('es-CL')}`;
    const fechaEmision = new Date().toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const fechaResolucionFmt = solicitud.fecha_resolucion
      ? new Date(solicitud.fecha_resolucion).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : fechaEmision;

    // Configurar encabezados HTTP para descarga PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="certificado-${solicitud.id}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // ── ENCABEZADO INSTITUCIONAL FINUSM - UTFSM ──
    doc.rect(0, 0, 595.28, 115).fill('#003366');
    doc.rect(0, 110, 595.28, 5).fill('#C8102E');

    doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold')
       .text('FinUSM — Universidad Técnica Federico Santa María', 50, 28);

    doc.fillColor('#DCE6F2').fontSize(11).font('Helvetica')
       .text('Dirección de Gestión Financiera Estudiantil · Certificado Oficial', 50, 56);

    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
       .text(`Folio Solicitud: #${solicitud.id}`, 50, 82)
       .text(`Fecha de Emisión: ${fechaEmision}`, 330, 82, { width: 215, align: 'right' });

    doc.y = 140;

    // ── TÍTULO DEL CERTIFICADO ──
    doc.rect(50, doc.y, 495, 44).fill('#EEF4FE');
    doc.rect(50, doc.y, 5, 44).fill('#003366');
    doc.fillColor('#003366').fontSize(16).font('Helvetica-Bold')
       .text(solicitud.tipo_certificado.toUpperCase(), 65, doc.y + 14);

    doc.y = 202;

    // ── DATOS DEL ESTUDIANTE Y DE LA SOLICITUD ──
    doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold')
       .text('1. Identificación del Estudiante', 50, doc.y);
    doc.moveDown(0.5);

    const infoTopY = doc.y;
    doc.rect(50, infoTopY, 495, 92).fill('#F9FAFB');
    doc.rect(50, infoTopY, 495, 92).strokeColor('#E5E7EB').lineWidth(1).stroke();

    doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold')
       .text('Nombre Estudiante:', 65, infoTopY + 14)
       .text('ID / Registro Estudiantil:', 65, infoTopY + 34)
       .text('Correo Institucional:', 65, infoTopY + 54)
       .text('Motivo Declarado:', 65, infoTopY + 72);

    doc.fillColor('#111827').fontSize(10).font('Helvetica')
       .text(solicitud.estudiante_nombre, 210, infoTopY + 14)
       .text(`EST-${String(solicitud.estudiante_id).padStart(4, '0')}`, 210, infoTopY + 34)
       .text(solicitud.estudiante_email || 'estudiante@usm.cl', 210, infoTopY + 54)
       .text(solicitud.motivo, 210, infoTopY + 72, { width: 320, lineBreak: false });

    doc.y = infoTopY + 112;

    // ── PÁRRAFO DE CERTIFICACIÓN ──
    const periodoTexto = aranceles.length > 0 ? aranceles[0].periodo : '2026-1';
    doc.fillColor('#1F2937').fontSize(10.5).font('Helvetica')
       .text(
         `La Dirección de Gestión Financiera Estudiantil (FinUSM) de la Universidad Técnica Federico Santa María certifica que el/la estudiante ${solicitud.estudiante_nombre} (ID N° ${solicitud.estudiante_id}), en el período académico ${periodoTexto}, registra la siguiente situación financiera y arancelaria en los sistemas institucionales:`,
         50,
         doc.y,
         { width: 495, align: 'justify', lineGap: 3 }
       );

    doc.moveDown(1.2);

    // ── RESUMEN DE SITUACIÓN FINANCIERA ──
    doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold')
       .text('2. Resumen de Situación Financiera', 50, doc.y);
    doc.moveDown(0.5);

    const tablaY = doc.y;
    const filasResumen = [
      { concepto: 'Total Aranceles Registrados en el Período', valor: fmtMoney(totalAranceles) },
      { concepto: 'Total Cargos / Deudas Registradas', valor: fmtMoney(totalDeudas) },
      { concepto: 'Total Cobertura por Beneficios y Becas', valor: fmtMoney(totalBeneficios) },
      { concepto: 'Total Pagos Realizados y Aplicados', valor: fmtMoney(totalPagos) },
      { concepto: 'Deudas Vigentes Pendientes de Pago', valor: fmtMoney(totalDeudasVigentes) },
      { concepto: 'Saldo Neto Pendiente Actual', valor: fmtMoney(saldoNeto), destacado: true }
    ];

    doc.rect(50, tablaY, 495, 24).fill('#003366');
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold')
       .text('CONCEPTO FINANCIERO', 65, tablaY + 7)
       .text('MONTO (CLP)', 380, tablaY + 7, { width: 150, align: 'right' });

    let filaY = tablaY + 24;
    filasResumen.forEach((fila, idx) => {
      const bg = fila.destacado ? '#EEF4FE' : idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(50, filaY, 495, 24).fill(bg);
      doc.rect(50, filaY, 495, 24).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

      doc.fillColor(fila.destacado ? '#003366' : '#1F2937')
         .fontSize(10)
         .font(fila.destacado ? 'Helvetica-Bold' : 'Helvetica')
         .text(fila.concepto, 65, filaY + 7)
         .text(fila.valor, 380, filaY + 7, { width: 150, align: 'right' });

      filaY += 24;
    });

    doc.y = filaY + 18;

    // ── DETALLE DE BENEFICIOS Y ARANCELES VIGENTES ──
    doc.fillColor('#111827').fontSize(12).font('Helvetica-Bold')
       .text('3. Detalle de Beneficios y Deudas Vigentes', 50, doc.y);
    doc.moveDown(0.5);

    const detalleBeneficiosTexto = beneficios.length > 0
      ? beneficios.map(b => `${b.tipo} (${fmtMoney(b.cobertura)})`).join(', ')
      : 'Sin beneficios registrados';

    const deudasVigentesLista = deudas.filter(d => (d.estado || '').toLowerCase() === 'pendiente');
    const detalleDeudasTexto = deudasVigentesLista.length > 0
      ? deudasVigentesLista.map(d => `${d.descripcion} (${fmtMoney(d.monto)})`).join(', ')
      : 'Sin deudas morosas ni pendientes de pago (Al día)';

    doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold')
       .text('Beneficios Estudiantiles Vigentes: ', 50, doc.y, { continued: true })
       .font('Helvetica').fillColor('#111827').text(detalleBeneficiosTexto);

    doc.moveDown(0.4);
    doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold')
       .text('Estado de Deudas Vigentes: ', 50, doc.y, { continued: true })
       .font('Helvetica').fillColor('#111827').text(detalleDeudasTexto);

    if (solicitud.observacion) {
      doc.moveDown(0.4);
      doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold')
         .text('Observación de Resolución: ', 50, doc.y, { continued: true })
         .font('Helvetica').fillColor('#111827').text(solicitud.observacion);
    }

    // ── SELLO DE RESOLUCIÓN Y FIRMA INSTITUCIONAL ──
    const firmaY = 675;
    doc.rect(50, firmaY, 495, 72).fill('#F0FDF4');
    doc.rect(50, firmaY, 4, 72).fill('#16A34A');

    doc.fillColor('#166534').fontSize(10).font('Helvetica-Bold')
       .text('CERTIFICADO VERIFICADO Y APROBADO DIGITALMENTE', 65, firmaY + 12);

    doc.fillColor('#374151').fontSize(9.5).font('Helvetica')
       .text(`Estado de Solicitud: ${solicitud.estado}`, 65, firmaY + 30)
       .text(`Resuelto por: ${solicitud.ejecutivo_nombre || 'Ejecutivo Financiero UTFSM'}`, 65, firmaY + 45)
       .text(`Fecha de Resolución: ${fechaResolucionFmt}`, 310, firmaY + 30)
       .text(`Código de Verificación: FINUSM-${solicitud.id}-${solicitud.estudiante_id}`, 310, firmaY + 45);

    // ── PIE DE PÁGINA ──
    doc.rect(0, 790, 595.28, 52).fill('#003366');
    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica')
       .text(
         'Se extiende el presente certificado a petición del interesado/a para los fines que estime convenientes. FinUSM — Universidad Técnica Federico Santa María.',
         50,
         806,
         { width: 495, align: 'center' }
       );

    doc.end();
  } catch (err) {
    console.error('Error al generar certificado PDF:', err);
    if (!res.headersSent) {
      res.status(500).send('Error al generar el certificado PDF');
    }
  }
}

module.exports = {
  mostrarFormularioSolicitud,
  crearSolicitud,
  listarMisSolicitudes,
  mostrarDashboardEjecutivo,
  listarSolicitudesEjecutivo,
  resolverSolicitud,
  descargarCertificado
};
