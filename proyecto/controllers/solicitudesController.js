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

    if (!motivo || motivo.length < 5) {
      req.session.mensaje = {
        tipo: 'error',
        texto: '❌ Debes ingresar un motivo válido para tu solicitud (mínimo 5 caracteres).'
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

// RS6: Consultar listado histórico y estado de solicitudes del estudiante
async function listarMisSolicitudes(req, res) {
  try {
    const estudianteId = req.session.usuario.estudiante_id;

    const mensaje = req.session.mensaje || null;
    delete req.session.mensaje;

    const result = await pool.query(
      `SELECT id, estudiante_id, tipo_certificado, motivo, estado, observacion, fecha_solicitud, fecha_resolucion
       FROM solicitudes
       WHERE estudiante_id = $1
       ORDER BY fecha_solicitud DESC, id DESC`,
      [estudianteId]
    );

    res.render('mis-solicitudes', {
      solicitudes: result.rows,
      mensaje
    });
  } catch (err) {
    console.error('Error al consultar estado de solicitudes:', err);
    res.status(500).send('Error al cargar el historial de solicitudes');
  }
}

// RS7: Mostrar dashboard del Ejecutivo con contador y notificación de nuevas solicitudes pendientes
async function mostrarDashboardEjecutivo(req, res) {
  try {
    const conteoResult = await pool.query(
      `SELECT COUNT(*)::INT AS pendientes
       FROM solicitudes
       WHERE estado = 'PENDIENTE'`
    );

    const ultimasResult = await pool.query(
      `SELECT s.id, s.tipo_certificado, s.motivo, s.fecha_solicitud, e.nombre AS estudiante_nombre
       FROM solicitudes s
       JOIN estudiantes e ON s.estudiante_id = e.id
       WHERE s.estado = 'PENDIENTE'
       ORDER BY s.fecha_solicitud DESC, s.id DESC
       LIMIT 5`
    );

    const solicitudesPendientes = conteoResult.rows[0] ? conteoResult.rows[0].pendientes : 0;

    res.render('ejecutivo', {
      solicitudesPendientes,
      ultimasPendientes: ultimasResult.rows
    });
  } catch (err) {
    console.error('Error al cargar panel ejecutivo:', err);
    res.render('ejecutivo', {
      solicitudesPendientes: 0,
      ultimasPendientes: []
    });
  }
}

module.exports = {
  mostrarFormularioSolicitud,
  crearSolicitud,
  listarMisSolicitudes,
  mostrarDashboardEjecutivo
};
