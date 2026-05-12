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