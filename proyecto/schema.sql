CREATE TABLE estudiantes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE aranceles (
    id SERIAL PRIMARY KEY,
    estudiante_id INT REFERENCES estudiantes(id),
    monto_total INT NOT NULL,
    periodo VARCHAR(20) NOT NULL
);

CREATE TABLE deudas (
    id SERIAL PRIMARY KEY,
    estudiante_id INT REFERENCES estudiantes(id),
    arancel_id INT REFERENCES aranceles(id),

    fecha_vencimiento DATE,
    estado VARCHAR(50)
);

CREATE TABLE beneficios (
    id SERIAL PRIMARY KEY,
    estudiante_id INT REFERENCES estudiantes(id),
    tipo VARCHAR(100),
    cobertura INT,
    vigencia DATE
);

CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    estudiante_id INT REFERENCES estudiantes(id),
    monto INT NOT NULL,
    fecha DATE,
    estado VARCHAR(50)
);

CREATE TABLE detalle_pagos (
    id SERIAL PRIMARY KEY,
    pago_id INT REFERENCES pagos(id),
    deuda_id INT REFERENCES deudas(id),
    monto_aplicado INT NOT NULL
);

CREATE TABLE detalle_historico (
    id INT REFERENCES estudiantes(id),
    ano INT,
    semestre INT,
    PRIMARY KEY (id, ano, semestre)
);

INSERT INTO detalle_historico (id, ano, semestre)
VALUES
(1, 2025, 1),
(2, 2025, 1),
(3, 2025, 1),
(1, 2026, 1),
(2, 2026, 1),
(3, 2026, 1);
