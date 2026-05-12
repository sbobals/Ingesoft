TRUNCATE detalle_pagos RESTART IDENTITY CASCADE;
TRUNCATE pagos RESTART IDENTITY CASCADE;
TRUNCATE beneficios RESTART IDENTITY CASCADE;
TRUNCATE deudas RESTART IDENTITY CASCADE;
TRUNCATE aranceles RESTART IDENTITY CASCADE;
TRUNCATE estudiantes RESTART IDENTITY CASCADE;

INSERT INTO estudiantes (nombre)
VALUES
('Juan Pérez'),
('María Soto'),
('Carlos Díaz');

INSERT INTO aranceles
(estudiante_id, monto_total, periodo)
VALUES
(1, 500000, '2025-1'),
(2, 450000, '2025-1'),
(3, 600000, '2025-1');

INSERT INTO deudas
(estudiante_id, arancel_id, monto, fecha_vencimiento, estado)
VALUES
(1, 1, 200000, '2026-06-01', 'pendiente'),
(2, 2, 100000, '2026-06-15', 'pendiente'),
(3, 3, 150000, '2026-07-01', 'pagada');

INSERT INTO beneficios
(estudiante_id, tipo, cobertura, vigencia)
VALUES
(1, 'Beca Excelencia', 50000, '2026-12-31'),
(2, 'Gratuidad', 100000, '2026-12-31'),
(3, 'Descuento Deportivo', 30000, '2026-12-31');

INSERT INTO pagos
(estudiante_id, monto, fecha, estado)
VALUES
(1, 100000, '2026-05-01', 'completado'),
(2, 50000, '2026-05-03', 'completado'),
(3, 150000, '2026-05-05', 'completado');

INSERT INTO detalle_pagos
(pago_id, deuda_id, monto_aplicado)
VALUES
(1, 1, 100000),
(2, 2, 50000),
(3, 3, 150000);