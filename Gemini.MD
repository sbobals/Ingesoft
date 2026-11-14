# Contexto del Proyecto - FinUSM (Sistema de Gestión Financiera Estudiantil)

## Resumen
Plataforma web para centralizar información financiera, permitiendo simular pagos y gestionar certificados para los estudiantes de la Universidad Técnica Federico Santa María.

## Stack Tecnológico
* Backend: Node.js con Express.js
* Vistas: EJS (HTML renderizado por el servidor)
* Base de Datos: PostgreSQL 15 (usando la biblioteca `pg`)
* Sesiones: `express-session`
* Generación de Documentos: PDFKit
* Infraestructura: Docker y Docker Compose[cite: 14, 17]

## Reglas de Arquitectura y Roles
* Roles principales: Estudiante (consulta y solicita), Ejecutivo (resuelve solicitudes), Administrador.
* Entidades principales (Relacional): USUARIOS, ESTUDIANTES, ARANCELES, DEUDAS, BENEFICIOS, PAGOS, DETALLE_PAGOS, DETALLE_HISTORICO.
* Entorno simulado: No integrar pasarelas de pago reales. Las transacciones impactan tablas de prueba locales.
* Interfaz: Utilizar formato estándar chileno para montos (ej. $1.500.000) e indicar claramente los saldos netos[cite: 3, 16, 35].