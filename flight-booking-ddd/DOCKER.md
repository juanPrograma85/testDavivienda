# Entorno Docker local

## Requisitos

- Docker Desktop iniciado.
- Puertos `3000` y `5433` disponibles.

PostgreSQL se publica en `localhost:5433` para no chocar con una instalacion
local que use `5432`. Dentro de la red de Compose, el backend se conecta a
`postgres:5432`; `localhost` nunca debe usarse entre contenedores.

## 1. Configurar variables

En PowerShell:

```powershell
Copy-Item .env.docker.example .env.docker
```

Edita `.env.docker` y cambia al menos:

```dotenv
POSTGRES_PASSWORD=una-clave-local-segura
ADMIN_API_KEY=una-clave-administrativa-de-32-caracteres
```

El archivo `.env.docker` esta ignorado por Git.

## 2. Construir e iniciar

```powershell
docker compose --env-file .env.docker up --build -d
```

Compose realiza este orden:

1. Crea la red privada `flight-booking_default`.
2. Inicia PostgreSQL y crea el volumen `flight-booking_postgres_data`.
3. Ejecuta en orden los scripts de `migrations/` al crear el volumen por primera vez.
  `900_seed_development_data.sql` crea los vuelos y asientos de demostracion.
4. Espera a que `pg_isready` confirme que PostgreSQL esta disponible.
5. Inicia NestJS con `DATABASE_URL` apuntando a `postgres:5432`.

## 3. Verificar servicios

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f backend
```

Abre:

- Swagger: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/openapi.json`
- API: `http://localhost:3000/api/v1`

Verifica PostgreSQL desde el contenedor:

```powershell
docker compose --env-file .env.docker exec postgres `
  psql -U flight_booking -d flight_booking -c "\dn"
```

Lista las tablas por bounded context:

```powershell
docker compose --env-file .env.docker exec postgres `
  psql -U flight_booking -d flight_booking `
  -c "\dt flight.*" -c "\dt seat_inventory.*" `
  -c "\dt reservation.*" -c "\dt payment.*"
```

## 4. Conectar una herramienta local

Usa estos datos en DBeaver, DataGrip o pgAdmin:

```text
Host: localhost
Port: 5433
Database: flight_booking
User: flight_booking
Password: valor de POSTGRES_PASSWORD
```

El backend no usa esa direccion. Su URL interna es:

```text
postgresql://flight_booking:<password>@postgres:5432/flight_booking
```

## 5. Detener o reiniciar

Detener conservando datos:

```powershell
docker compose --env-file .env.docker down
```

Reiniciar:

```powershell
docker compose --env-file .env.docker up -d
```

## 6. Reiniciar la base desde cero

Esta operacion elimina todos los datos del volumen local:

```powershell
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up --build -d
```

Los scripts de `/docker-entrypoint-initdb.d` solo se ejecutan cuando el volumen
esta vacio. Para una base existente, aplica nuevas migraciones explicitamente:

```powershell
Get-Content src/shared/infrastructure/persistence/migrations/004_add_seat_hold_user_document.sql | `
  docker compose --env-file .env.docker exec -T postgres `
  psql -v ON_ERROR_STOP=1 -U flight_booking -d flight_booking
```

Para cargar los datos de demostracion en una base existente:

```powershell
Get-Content src/shared/infrastructure/persistence/migrations/900_seed_development_data.sql | `
  docker compose --env-file .env.docker exec -T postgres `
  psql -v ON_ERROR_STOP=1 -U flight_booking -d flight_booking
```

El seed es idempotente: crea los datos faltantes, pero no reemplaza vuelos,
holds, ocupaciones ni reservas existentes. No montes este seed en produccion.

## 7. Desarrollo con backend fuera de Docker

Si solo PostgreSQL se ejecuta en Docker:

```powershell
docker compose --env-file .env.docker up -d postgres
```

Configura el `.env` local del backend con el puerto publicado:

```dotenv
DATABASE_URL=postgresql://flight_booking:<password>@localhost:5433/flight_booking
```

Luego ejecuta:

```powershell
npm run start:dev
```

## Diagnostico rapido

```powershell
docker compose --env-file .env.docker logs postgres
docker compose --env-file .env.docker logs backend
docker compose --env-file .env.docker config
```

- Si `5433` esta ocupado, cambia `POSTGRES_PORT` en `.env.docker`.
- Si `3000` esta ocupado, cambia `BACKEND_PORT`; dentro del contenedor sigue
  siendo `3000`.
- Si cambias usuario, clave o nombre de una base ya inicializada, elimina el
  volumen con `down -v` o conserva los valores originales.

## 8. Trasladar los datos a otra maquina

La imagen de PostgreSQL contiene el motor, no tus datos. El volumen
`flight-booking_postgres_data` persiste solamente en el host donde fue creado.
Para mover el entorno se utiliza un backup logico de PostgreSQL.

### En la maquina de origen

```powershell
.\scripts\backup-database.ps1
```

El comando crea un archivo como:

```text
backups/flight_booking-20260924-180000.dump
```

Copia ese archivo a la nueva maquina mediante almacenamiento cifrado. Los
backups estan ignorados por Git porque pueden contener datos sensibles.

### En la maquina de destino

1. Instala Docker Desktop y copia/clona el proyecto.
2. Crea `.env.docker` desde `.env.docker.example`.
3. Usa el mismo `POSTGRES_DB` y `POSTGRES_USER` del origen. La clave puede ser
   diferente porque el dump no contiene credenciales del servidor.
4. Copia el archivo `.dump` dentro de la carpeta `backups/`.
5. Restaura la base:

```powershell
.\scripts\restore-database.ps1 `
  -BackupPath .\backups\flight_booking-20260924-180000.dump
```

El script inicia PostgreSQL, detiene el backend para evitar escrituras durante
la restauracion, reemplaza el esquema destino y vuelve a iniciar el backend.

Verifica el resultado:

```powershell
docker compose ps
docker compose exec -T postgres psql -U flight_booking -d flight_booking `
  -c "SELECT COUNT(*) FROM flight.flights;" `
  -c "SELECT COUNT(*) FROM seat_inventory.seats;"
```

No copies directamente `/var/lib/postgresql/data` mientras PostgreSQL esta
ejecutandose. Ese metodo depende de la version exacta del motor y puede producir
un volumen inconsistente. Para entornos compartidos o productivos utiliza
backups automaticos cifrados, retencion y pruebas periodicas de restauracion.