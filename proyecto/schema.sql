CREATE TABLE estudiantes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL,
    estudiante_id INT REFERENCES estudiantes(id)
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
    monto INT NOT NULL,
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