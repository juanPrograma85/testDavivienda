# Reserva de vuelos

## Proyectos

| Proyecto | Descripcion | Puerto local |
| --- | --- | --- |
| [flight-booking-ddd](flight-booking-ddd/) | API NestJS y configuracion de Docker Compose | `3000` |
| [flight-front](flight-front/) | Aplicacion Angular servida por Nginx en Docker | `8080` con Docker, `4200` en desarrollo |
| PostgreSQL | Base de datos del servicio `postgres` de Compose | `5433` |

Se necesitan Docker Desktop y, para desarrollo fuera de contenedores, Node.js 22 y npm. Ejecuta los comandos siguientes en PowerShell desde la raiz del repositorio. Elige **Docker** o **desarrollo local**; no inicies ambos backends a la vez porque usan el mismo puerto.

## Ejecutar todo con Docker

1. Crea el archivo de configuracion y edita `POSTGRES_PASSWORD` y `ADMIN_API_KEY` con valores propios (`ADMIN_API_KEY` debe tener al menos 32 caracteres):

	```powershell
	Set-Location .\flight-booking-ddd
	Copy-Item .env.docker.example .env.docker
	notepad .env.docker
	```

2. Construye e inicia los tres servicios:

	```powershell
	docker compose --env-file .env.docker up --build -d
	docker compose --env-file .env.docker ps
	```

	Compose inicia **PostgreSQL -> backend -> frontend**. Espera a que la base y el backend esten saludables antes de iniciar el siguiente servicio. Las migraciones y los datos de demostracion se cargan al crear el volumen de la base por primera vez.

3. Abre el frontend en <http://localhost:8080> o Swagger en <http://localhost:3000/docs>. Para ver los registros o detener los servicios sin borrar la base:

	```powershell
	docker compose --env-file .env.docker logs -f backend frontend
	docker compose --env-file .env.docker down
	```

Los puertos se pueden cambiar con `FRONTEND_PORT`, `BACKEND_PORT` y `POSTGRES_PORT` en `.env.docker`. Consulta [DOCKER.md](flight-booking-ddd/DOCKER.md) para copias de seguridad, restauracion y diagnostico.

## Desarrollo local

El orden es **base de datos -> backend -> frontend**. Usa tres terminales PowerShell abiertas desde la raiz del repositorio:

1. **Base de datos (terminal 1):**

	```powershell
	Set-Location .\flight-booking-ddd
	Copy-Item .env.docker.example .env.docker
	notepad .env.docker
	docker compose --env-file .env.docker up -d postgres
	```

	Antes de iniciar, cambia `POSTGRES_PASSWORD` en `.env.docker`. Si ya seguiste la seccion Docker, conserva el archivo existente y omite `Copy-Item`.

2. **Backend (terminal 2):**

	```powershell
	Set-Location .\flight-booking-ddd
	Copy-Item .env.example .env
	notepad .env
	npm ci
	npm run start:dev
	```

	Antes de `npm run start:dev`, ajusta `.env`: usa `DATABASE_URL=postgresql://flight_booking:<POSTGRES_PASSWORD>@localhost:5433/flight_booking`, configura `CORS_ORIGINS=http://localhost:4200` y define un `ADMIN_API_KEY` de al menos 32 caracteres. La clave de la URL debe coincidir con `.env.docker`. Si ya tienes un `.env` configurado, omite `Copy-Item`.

3. **Frontend (terminal 3):**

	```powershell
	Set-Location .\flight-front
	npm ci
	npm start
	```

	Abre <http://localhost:4200>. El servidor de Angular redirige `/api/v1` al backend en `localhost:3000` mediante [proxy.conf.json](flight-front/proxy.conf.json).

Para detener el desarrollo, interrumpe ambos procesos con `Ctrl+C` y ejecuta `docker compose --env-file .env.docker down` desde `flight-booking-ddd` para detener PostgreSQL sin eliminar sus datos.