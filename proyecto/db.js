const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function inicializarBaseDeDatos() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedPath = path.join(__dirname, 'seed.sql');

    // 1. Asegurar que todas las tablas y columnas existan (idempotente)
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      await pool.query(
        `ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS ejecutivo_id INT REFERENCES usuarios(id) DEFAULT NULL;`
      );
    }

    // 2. Si la base de datos está vacía, ejecutar seed.sql en UTF-8 nativo
    const countRes = await pool.query(`SELECT COUNT(*)::INT AS total FROM usuarios`);
    const totalUsuarios = countRes.rows[0] ? countRes.rows[0].total : 0;

    if (totalUsuarios === 0 && fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await pool.query(seedSql);
      console.log('Base de datos inicializada automáticamente con schema.sql y seed.sql (UTF-8).');
      return;
    }

    // 3. Corregir automáticamente registros con codificación corrupta (mojibake de PowerShell)
    const corruptCheck = await pool.query(
      `SELECT COUNT(*)::INT AS corruptos FROM usuarios WHERE nombre LIKE '%Ã%'`
    );
    if (corruptCheck.rows[0] && corruptCheck.rows[0].corruptos > 0) {
      await pool.query(`
        UPDATE estudiantes SET nombre = 'Juan Pérez' WHERE id = 1;
        UPDATE estudiantes SET nombre = 'María Soto' WHERE id = 2;
        UPDATE estudiantes SET nombre = 'Carlos Díaz' WHERE id = 3;

        UPDATE usuarios SET nombre = 'Juan Pérez' WHERE email = 'juan@usm.cl';
        UPDATE usuarios SET nombre = 'María Soto' WHERE email = 'maria@usm.cl';
        UPDATE usuarios SET nombre = 'Carlos Díaz' WHERE email = 'carlos@usm.cl';

        UPDATE deudas SET descripcion = 'Arancel académico - cuota 1' WHERE id = 1;
        UPDATE deudas SET descripcion = 'Arancel académico - cuota 2' WHERE id = 2;
        UPDATE deudas SET descripcion = 'Arancel académico - cuota 3' WHERE id = 3;

        UPDATE solicitudes
        SET tipo_certificado = 'Certificado de Arancel y Matrícula'
        WHERE tipo_certificado LIKE 'Certificado de Arancel y Matr%';

        UPDATE solicitudes
        SET tipo_certificado = 'Seguro de Práctica'
        WHERE tipo_certificado LIKE 'Seguro de Pr%';

        UPDATE solicitudes
        SET motivo = 'Trámite de renovación de pase escolar (TNE)'
        WHERE id = 1 AND motivo LIKE '%renovaci%';

        UPDATE solicitudes
        SET motivo = 'Postulación a beca municipal',
            observacion = CASE
              WHEN observacion LIKE 'Documentaci%' THEN 'Documentación financiera al día.'
              ELSE observacion
            END
        WHERE id = 2;

        UPDATE solicitudes
        SET motivo = 'Práctica industrial de verano en empresa externa'
        WHERE id = 3 AND motivo LIKE 'Pr%';
      `);
      console.log('Codificación UTF-8 de nombres y textos corregida automáticamente en PostgreSQL.');
    }
  } catch (err) {
    console.error('Error al inicializar/verificar la base de datos:', err);
  }
}

pool.inicializarBaseDeDatos = inicializarBaseDeDatos;

module.exports = pool;
