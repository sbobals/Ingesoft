# Grupo 1
Integrantes:
* Fernanda Antonia Pérez Cruz - 202210108-3 - fernanda.perez@alumnos.inf.utfsm.cl
* Cristofer Ivan Rojas Medina - 202373543-4 - cristofer.rojas@alumnos.inf.utfsm.cl
* Cristobal Enrique Lazo Sepulveda - 202373592-2 -cristobal.lazo@alumnos.inf.utfsm.cl
* Martin Vicente Mella Chavez - 202373529-9 -martin.mella@alumnos.inf.utfsm.cl

Ayudante:
* Javiera Osorio - javiera.osorio@alumnos.inf.utfsm.cl

Un enlace a la Wiki con la cual se va a trabajar.
https://gitlab.inf.utfsm.cl/inf236-2026-1/inf236-sj-01/-/wikis/home

## Cómo levantar el proyecto

### Requisitos

* Docker
* Docker Compose

### Pasos

1. Clonar el repositorio:

```
git clone <URL>
cd <proyecto>
```

2. Ejecutar el sistema:

```
docker compose up --build
```

3. Acceder a la aplicación:

```
http://localhost:3000
```

### Endpoints disponibles

/init → crea tablas en la base de datos

/seed → inserta datos de prueba

/deudas → lista de deudas

/pagos → lista de pagos

/beneficios → lista de beneficios

/estado-financiero → muestra resumen en HTML

/proyeccion → calcula saldo futuro

/resumen → dashboard financiero (vista demo)