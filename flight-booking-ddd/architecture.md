# Flight Booking - Arquitectura

## 1. Objetivo

Definir una base preparada para integrar un backend NestJS con un frontend Angular mediante REST y Server-Sent Events (SSE), manteniendo DDD, arquitectura hexagonal y un Modular Monolith. El sistema soporta busqueda de vuelos, mapa de asientos, bloqueos temporales concurrentes, pago ficticio, confirmacion de reserva y metricas de ocupacion en tiempo real.

El MVP no requiere Kafka ni microservicios. PostgreSQL es obligatorio desde el
primer despliegue y constituye la fuente de verdad de todos los modulos. Los
puertos y eventos quedan preparados para sustituir el bus en memoria por
Outbox/Kafka cuando el volumen o la distribucion del sistema lo justifique.

## 2. Architectural Style

- **Modular Monolith:** los bounded contexts se despliegan juntos, pero poseen limites, dependencias y contratos que permiten extraerlos posteriormente.
- **DDD:** reglas de negocio en agregados, entidades, value objects y eventos de dominio. Los casos de uso orquestan; los controladores adaptan transporte.
- **Hexagonal Architecture:** el dominio y la aplicacion dependen de ports; las implementaciones concretas viven en infraestructura.
- **REST + SSE:** REST obtiene snapshots y ejecuta comandos. SSE es solamente salida `Backend -> Angular`; nunca es el canal interno entre modulos.

El flujo interno es:

```text
Use Case -> Domain Event -> EventBus -> Subscriber -> RealtimeHub -> SSE -> Angular
```

El dominio no importa NestJS, Express, Fastify, SSE, HTTP, PostgreSQL ni un ORM.

## 3. Bounded Contexts / Modules

### Flight

Administra catalogo, origen, destino, fecha, horarios, tarifas y estado operativo del vuelo. Expone `SearchFlightsUseCase`, `GetFlightUseCase` y `ChangeFlightStatusUseCase`.

### Seat Inventory

Administra el mapa de asientos y la maquina de estados `AVAILABLE`, `HELD` y `OCCUPIED`. Es responsable de la atomicidad del hold, expiracion, liberacion, ocupacion y metricas del vuelo.

### Reservation (preparado, aun no implementado)

Debe ser el bounded context dueño de la reserva, el booking code, el pasajero y el estado de confirmacion. En el MVP el flujo puede coordinarse desde una capa de aplicacion, pero no se debe confundir Reservation con Seat Inventory ni con Payment.

### Payment

Procesa el pago ficticio mediante `PaymentGatewayPort` y publica `PaymentSettled`. No cambia directamente el estado de un asiento.

### Shared

Contiene el kernel compartido: identificadores, dinero, errores, reloj, contrato de eventos, bus en proceso, hub realtime, DTOs SSE, seguridad y filtros HTTP. No es dueño de la persistencia de los bounded contexts.

## 4. Domain Responsibilities

El agregado `SeatMap` es la frontera de consistencia por vuelo. Sus entidades `Seat` y `SeatHold` mantienen las invariantes:

- Un asiento solo puede tener un hold activo.
- Un hold contiene `status`, `holdId`, `userName`, `userDocument` y `holdExpiresAt`.
- Un asiento `HELD` solo pasa a `OCCUPIED` con el `holdId` valido y no expirado.
- Un asiento `OCCUPIED` no vuelve a `AVAILABLE` desde el flujo normal de compra.
- La expiracion transforma `HELD` en `AVAILABLE` una sola vez.

Los agregados registran hechos de dominio. No conocen el transporte SSE ni publican directamente al bus; el caso de uso extrae los eventos y usa el port `EventBusPort`.

## 5. Application Layer

Los casos de uso actuales o previstos son:

- `SearchFlightsUseCase`: busca por origen, destino y fecha.
- `GetFlightUseCase`: obtiene un vuelo.
- `ChangeFlightStatusUseCase`: actualiza estado y publica `FlightStatusChanged`.
- `GetSeatMapUseCase`: entrega el snapshot inicial del mapa.
- `HoldSeatUseCase`: intenta el hold atomico con nombre, cedula y TTL.
- `ReleaseSeatUseCase`: libera un hold autorizado.
- `ExpireSeatHoldsUseCase`: barre expiraciones de forma repetible.
- `OccupySeatUseCase`: convierte un hold valido en ocupacion permanente.
- `GetFlightOccupancyUseCase`: calcula disponibilidad, holds y ocupacion.
- `ProcessPaymentUseCase`: procesa el pago ficticio e informa `PaymentSettled`.
- `ConfirmReservationUseCase` (preparado): coordina reserva, pago y ocupacion.

Los casos de uso criticos deben aceptar `operationId` cuando el API de reserva este implementado. La repeticion de una operacion debe devolver el resultado conocido o un conflicto de dominio, no ejecutar un segundo cambio.

## 6. Infrastructure Layer

PostgreSQL es la fuente de verdad y el lugar donde persisten todos los datos de
Flight, Seat Inventory, Reservation y Payment. Cada modulo mantiene su propio
schema o tablas delimitadas y accede a ellas exclusivamente mediante sus ports.
Los repositorios `InMemory*` solo pueden registrarse en tests unitarios o
entornos efimeros de desarrollo; nunca en un despliegue compartido.

El port de Seat Inventory debe implementarse con una operacion atomica equivalente a:

```sql
UPDATE seats
SET status = 'HELD', hold_id = :holdId, user_name = :userName,
    user_document = :userDocument, hold_expires_at = :expiresAt
WHERE flight_id = :flightId
  AND seat_id = :seatId
  AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_expires_at <= :now));
```

El resultado debe distinguir `success`, `conflict` y `not_found`. No se debe implementar `findSeat(); if available; saveHeld()` sin proteccion de concurrencia. Nunca se mantiene una transaccion abierta durante los 5-10 minutos del hold.

El port puede conservar una operacion de coordinacion para el MVP:

```ts
withLock<T>(flightId: UniqueId, mutation: () => Promise<T>): Promise<T>;
```

La implementacion PostgreSQL usa una condicion atomica, constraint unica,
bloqueo de fila o una combinacion equivalente. El mutex en memoria no protege
dos instancias del backend y por tanto no es una estrategia de produccion.

## 7. Presentation Layer

Los controllers solamente reciben y validan entradas de transporte, llaman un caso de uso y mapean la salida. No contienen reglas de negocio, locks, persistencia ni suscripciones internas al bus.

Los DTOs HTTP y SSE no son entidades ni eventos de dominio. Esta separacion permite evolucionar el contrato de Angular sin contaminar el dominio.

## 8. Seat Inventory State Machine

```text
AVAILABLE --successful atomic hold--> HELD
HELD --payment and confirmation--> OCCUPIED
HELD --release or expiration--> AVAILABLE
OCCUPIED --normal booking flow--> terminal
```

`SeatMap` debe publicar un evento incremental para cada transicion relevante. El dashboard puede consumir adicionalmente `OccupancyChanged` como proyeccion, pero el mapa recibe solamente el asiento afectado.

## 9. Concurrency Strategy

Dos usuarios pueden intentar el mismo asiento simultaneamente. La persistencia debe aceptar como maximo una transicion exitosa:

```text
User A -> tryHoldSeat -> success
User B -> tryHoldSeat -> conflict
```

El port de dominio/aplicacion mantiene la expresion de la operacion; la infraestructura decide si usa SQL atomico, optimistic locking o row locking. La respuesta de conflicto se mapea a HTTP `409 Conflict`.

## 10. Temporary Hold Lifecycle

El hold se persiste como estado, no como una transaccion abierta. Contiene:

```text
status = HELD
holdId
userName
userDocument
holdExpiresAt
```

El scheduler busca holds expirados, ejecuta la liberacion bajo la misma proteccion de concurrencia, persiste el resultado y publica `SeatHoldExpired`. Puede ejecutarse repetidamente: solo la primera transicion libera el asiento y las siguientes no generan una doble liberacion.

## 11. Reservation Flow

1. Angular obtiene el mapa y crea un hold.
2. El cliente envia `flightId`, asiento, `holdId`, datos del pasajero y `operationId` a `POST /api/v1/reservations`.
3. Reservation valida que el hold pertenezca al cliente y siga vigente.
4. Payment procesa el pago ficticio de forma idempotente.
5. La coordinacion confirma la reserva y llama a `OccupySeatUseCase`.
6. Se genera un booking code unico y se responde con el boleto.

Reservation debe ser un modulo separado cuando se implemente formalmente. No se crea aqui una implementacion ficticia solo para simular el bounded context.

## 12. Payment Flow

`PaymentSettled` no implica que la ocupacion haya sido persistida de forma automatica. Existe una ventana de fallo:

```text
payment successful + seat occupation failed
```

En el Modular Monolith, `ConfirmReservationUseCase` debe coordinar una operacion idempotente y registrar el estado de compensacion o reintento. Si Payment se extrae como microservicio, la evolucion natural es una Saga con compensacion/refund y reintentos, no una transaccion distribuida improvisada.

El procesamiento actual serializa solicitudes por `reservationId` mediante un
advisory lock transaccional. Si el pago ya existe, se lee con `SELECT ... FOR
UPDATE`; si aun no existe, el advisory lock protege la primera insercion. El
estado `PENDING` y su liquidacion `AUTHORIZED` o `DECLINED` se confirman con un
unico `COMMIT`. Solo despues del commit se publica `PaymentSettled` y se responde
al `POST /api/v1/payments`. Mientras se use el gateway local esta operacion es
corta; al integrar un gateway remoto debe cambiarse a `PENDING + outbox` para no
mantener una transaccion SQL abierta durante I/O de red.

## 13. Domain Events

Los eventos minimos son:

| Evento | Datos relevantes |
| --- | --- |
| `FlightStatusChanged` | `eventId`, `version`, `occurredAt`, `flightId`, estado nuevo |
| `SeatHeld` | `flightId`, `seatId`, `holdId`, `expiresAt`, `status` |
| `SeatReleased` | `flightId`, `seatId`, motivo/origen, `status` |
| `SeatHoldExpired` | `flightId`, `seatId`, `holdId`, `expiresAt`, `status` |
| `SeatOccupied` | `flightId`, `seatId`, `reservationId`, `status` |
| `PaymentSettled` | `paymentId`, `reservationId`, importe, estado |

Cada evento tiene `eventId` unico, `version`, `occurredAt`, `aggregateId` y un payload serializable. Los eventos son hechos de dominio, no contratos HTTP.

## 14. Internal Event Bus

La comunicacion interna es:

```text
Domain Event -> EventBusPort -> InMemoryEventBus -> Subscribers
```

SSE no aparece en este flujo como transporte entre modulos. El bus en proceso
es suficiente para el MVP dentro de una instancia, pero no reemplaza la
persistencia PostgreSQL ni garantiza entrega entre instancias. El port permite
sustituirlo por Outbox o broker sin cambiar el dominio.

## 15. Realtime Architecture

```text
SeatInventory
      |
      | Domain Event
      v
   EventBus
      |
      v
Realtime Event Subscriber / Mapper
      |
      v
  RealtimeHub (flightId -> multiples clientes)
      |
      v
      SSE
      |
      v
    Angular
```

`RealtimeHub` administra conexiones por `flightId`, filtra antes de publicar y envia el evento solo a clientes interesados. Debe soportar multiples clientes simultaneos, limpieza al desconectar y heartbeat. El controller SSE no contiene logica de negocio.

## 16. SSE Contract

Cada mensaje usa el siguiente envelope:

```json
{
  "eventId": "uuid",
  "type": "SeatHeld",
  "version": 1,
  "occurredAt": "2026-09-24T13:20:00.000Z",
  "flightId": "FL-001",
  "aggregateId": "12A",
  "payload": {
    "seatId": "12A",
    "status": "HELD",
    "holdId": "uuid",
    "expiresAt": "2026-09-24T13:25:00.000Z"
  }
}
```

En la trama SSE se envia:

```text
id: uuid
event: SeatHeld
data: {"eventId":"uuid","type":"SeatHeld",...}
```

El dominio no se envia directamente. El `SseEventMapper` adapta nombres como `seat.held` a `SeatHeld`, elimina detalles internos y convierte `seatNumber` en `seatId`.

### Ejemplos de payloads incrementales

```json
{
  "eventId": "e-held",
  "type": "SeatHeld",
  "version": 1,
  "occurredAt": "2026-09-24T13:20:00.000Z",
  "flightId": "FL-001",
  "aggregateId": "12A",
  "payload": { "seatId": "12A", "status": "HELD", "holdId": "h-1", "expiresAt": "2026-09-24T13:25:00.000Z" }
}
```

```json
{
  "eventId": "e-released",
  "type": "SeatReleased",
  "version": 1,
  "occurredAt": "2026-09-24T13:21:00.000Z",
  "flightId": "FL-001",
  "aggregateId": "12A",
  "payload": { "seatId": "12A", "status": "AVAILABLE", "reason": "released-by-user" }
}
```

```json
{
  "eventId": "e-expired",
  "type": "SeatHoldExpired",
  "version": 1,
  "occurredAt": "2026-09-24T13:25:00.000Z",
  "flightId": "FL-001",
  "aggregateId": "12A",
  "payload": { "seatId": "12A", "status": "AVAILABLE", "holdId": "h-1", "expiresAt": "2026-09-24T13:25:00.000Z" }
}
```

```json
{
  "eventId": "e-occupied",
  "type": "SeatOccupied",
  "version": 1,
  "occurredAt": "2026-09-24T13:22:00.000Z",
  "flightId": "FL-001",
  "aggregateId": "12A",
  "payload": { "seatId": "12A", "status": "OCCUPIED", "reservationId": "R-1001" }
}
```

## 17. Snapshot + Event Stream

Angular nunca depende exclusivamente de SSE para el estado inicial:

```text
1. GET /api/v1/flights/{flightId}/seats
2. Angular pinta el snapshot
3. GET /api/v1/flights/{flightId}/events
4. Angular aplica solo los cambios incrementales
```

Un cambio de un asiento no vuelve a enviar todo el mapa. El evento contiene el `flightId`, `seatId`, nuevo estado y datos necesarios para actualizar ese elemento.

## 18. SSE Reconnection

- Cada mensaje tiene `id: eventId`.
- Angular reconecta usando el mecanismo SSE estandar y envia `Last-Event-ID`.
- El MVP puede reanudar desde el estado actual mediante un nuevo snapshot; no requiere replay persistente.
- `RealtimeHub` debe conservar el contrato para añadir una tabla Outbox/event log y replay posterior.
- Se envia heartbeat periodico para evitar conexiones ociosas abandonadas.
- La suscripcion se elimina al cerrar el request y el filtrado siempre incluye `flightId`.

## 19. API Contracts

### Snapshot de asientos

`GET /api/v1/flights/{flightId}/seats`, donde `flightId` usa el formato de
negocio `^[A-Z]{2,3}[0-9]{3}$`, por ejemplo `THA001`, `MAD264` o `AV453`.

Respuesta `200`:

```json
{ "flightId": "FL-001", "seats": [{ "seatId": "12A", "status": "AVAILABLE" }], "occupancy": { "availableSeats": 80, "heldSeats": 2, "occupiedSeats": 18 } }
```

### Eventos SSE

`GET /api/v1/flights/{flightId}/events`

Respuesta `200`, `Content-Type: text/event-stream`, con eventos `SeatHeld`, `SeatReleased`, `SeatHoldExpired` y `SeatOccupied`.

### Crear hold

`POST /api/v1/flights/{flightId}/seats/{seatId}/hold`

Request: `{ "userName": "Maria Perez", "userDocument": "1020304050" }`

Respuesta `201`: `{ "flightId": "FL-001", "seatId": "12A", "holdId": "h-1", "expiresAt": "..." }`.
Errores: `400` entrada invalida, `404` vuelo/asiento inexistente, `409` asiento ocupado o hold en conflicto.

### Liberar hold

`POST /api/v1/flights/{flightId}/seats/{seatId}/release`

Request: `{ "userDocument": "1020304050" }`

Respuesta `200`: `{ "released": true }`. Un hold ajeno o una ocupacion permanente producen `409`.

### Procesar pago

`POST /api/v1/payments`

Request:

```json
{
  "reservationId": "b2f5c434-e8e4-4f72-8738-4749b27cd68c",
  "amount": 42050,
  "card": {
    "pan": "4111111111111111",
    "cvv": "123",
    "expiryMonth": 12,
    "expiryYear": 2030,
    "holderName": "Maria Perez"
  }
}
```

Respuesta `201`: pago persistido con estado `AUTHORIZED` o `DECLINED`, tarjeta
enmascarada y sin PAN ni CVV. Al liquidarse publica `PaymentSettled`. Repetir el
mismo `reservationId` devuelve el pago existente y no ejecuta un segundo cobro.

### Confirmar reserva

`POST /api/v1/reservations`

Request: `{ "flightId": "FL-001", "seatId": "12A", "holdId": "h-1", "operationId": "op-3", "payment": { "cardToken": "fake-token" } }`

Respuesta `201`: `{ "reservationId": "R-1001", "bookingCode": "ABC123", "status": "CONFIRMED" }`.
Errores: `409` hold invalido o idempotencia en conflicto, `422` pago rechazado.

## 20. Angular Integration Contract

El cliente puede implementar:

```ts
loadSeats(flightId: string): Observable<SeatMapSnapshot>;
connectToSeatEvents(flightId: string): EventSource;
```

Al recibir `SeatHeld`, `SeatReleased`, `SeatHoldExpired` o `SeatOccupied`, debe buscar `payload.seatId` y actualizar unicamente ese asiento. El dashboard puede actualizar sus contadores desde `OccupancyChanged` o derivarlos de la misma proyeccion local.

## 21. Persistence

Los ports actuales son `FlightRepositoryPort`, `SeatMapRepositoryPort`, `PaymentRepositoryPort` y `PaymentGatewayPort`. Sus adapters de produccion deben persistir en PostgreSQL. La persistencia en memoria queda reservada para tests unitarios y doubles controlados.

Las tablas se separan por bounded context mediante los schemas PostgreSQL
`flight`, `seat_inventory`, `reservation`, `payment` y `shared`. Cada modulo
escribe solo en su schema y colabora con los demas mediante ports y casos de
uso publicados.

Los datos de demostracion se crean mediante un seed SQL idempotente durante la
inicializacion del PostgreSQL local. El backend no inserta fixtures durante su
arranque y el seed no forma parte de los despliegues productivos.

La implementacion persistente debe guardar el estado del hold, usar constraint o condicion atomica, y mantener indices por `flightId`, `seatId`, `status` y `holdExpiresAt`. La futura Outbox debe persistir evento y cambio de estado en la misma transaccion local.

## 22. Idempotency

Operaciones que deben tolerar reintentos: `HoldSeat`, `ReleaseSeat`, `ExpireSeatHold`, `OccupySeat` y `ConfirmReservation`. Estrategias preparadas:

- `operationId` para comandos HTTP.
- `holdId` para validar propiedad y evitar ocupaciones repetidas.
- `bookingId` o `reservationId` unico.
- `eventId` y tabla de eventos procesados para subscribers.
- constraints unicas en persistencia.

Un subscriber repetido no debe volver a decrementar contadores ni crear otra
reserva. La deduplicacion de produccion debe persistir sus claves en PostgreSQL;
una deduplicacion en memoria solo es valida dentro de un test o como cache no
autoritativa.

## 23. Testing Strategy

### Domain

- `AVAILABLE -> HELD` con TTL y datos de hold persistibles.
- `HELD -> OCCUPIED` con hold valido.
- `HELD -> AVAILABLE` por liberacion y expiracion.
- rechazo de `OCCUPIED -> AVAILABLE` desde reserva.

### Concurrency

Ejecutar dos `tryHoldSeat` simultaneos para el mismo vuelo/asiento y verificar `User A -> success` y `User B -> conflict`.

### Expiration

Verificar `HELD -> AVAILABLE`, un solo `SeatHoldExpired` y ejecuciones repetidas del scheduler sin doble liberacion.

### SSE

Verificar `Domain Event -> EventBus -> Realtime Subscriber -> RealtimeHub -> SSE client`, envelope, `eventId`, `flightId`, filtrado y multiples clientes.

### Idempotency

Repetir comando, evento y confirmacion; el estado final debe ser correcto y no debe haber cobro, ocupacion o notificacion duplicada.

## 24. Future Outbox/Kafka Evolution

MVP, con PostgreSQL como persistencia y bus en proceso:

```text
Domain -> PostgreSQL transaction -> EventBusPort -> InMemoryEventBus
```

Evolucion:

```text
Domain -> EventPort -> Outbox transaction -> Publisher -> Kafka
```

Kafka no es requisito del MVP. El dominio mantiene sus eventos y puertos sin conocer el broker; solo cambia el adapter y la estrategia de entrega. La Outbox permite publicar despues de confirmar el estado persistido y soportar reintentos, orden por agregado y replay para reconexion SSE.

## 25. Implementation Roadmap

1. **Fase 1:** dominio de asientos, estados, eventos y ports.
2. **Fase 2:** repositorio persistente, hold atomico y proteccion concurrente.
3. **Fase 3:** expiracion, release e idempotencia.
4. **Fase 4:** EventBus, subscriber realtime y `RealtimeHub` por `flightId`.
5. **Fase 5:** controller SSE, DTOs y envelope versionado.
6. **Fase 6:** snapshot y API de mapa de asientos.
7. **Fase 7:** Reservation, Payment, OccupySeat y booking code.
8. **Fase 8:** reconexion, heartbeat y preparacion de `Last-Event-ID`.
9. **Fase 9:** pruebas de integracion, concurrencia y SSE.
10. **Fase 10:** Outbox y evolucion hacia Kafka.

## 26. Estructura del backend resultante

```text
src/
├── config/
├── modules/
│   ├── flight/
│   │   ├── domain/{model,events,ports}
│   │   ├── application/{use-cases,services,event-handlers,mappers}
│   │   ├── infrastructure/persistence/{postgres,testing}
│   │   └── presentation/http/{dto}
│   ├── seat-inventory/
│   │   ├── domain/{model,events,ports}
│   │   ├── application/{use-cases,services,mappers}
│   │   ├── infrastructure/{persistence/postgres,persistence/testing,scheduling,acl}
│   │   └── presentation/http/{dto}
│   ├── reservation/                         # bounded context preparado
│   │   ├── domain/{model,events,ports}
│   │   ├── application/{use-cases,services}
│   │   ├── infrastructure/persistence/postgres
│   │   └── presentation/http/{dto}
│   ├── payment/
│   │   ├── domain/{model,events,ports}
│   │   ├── application/{use-cases,services}
│   │   ├── infrastructure/persistence/postgres
│   │   └── presentation/http/{dto}
│   └── shared/
│       ├── domain/{events,errors,model}
│       ├── application/{ports,realtime}
│       ├── infrastructure/{events,realtime,time,security,http}
│       └── presentation/sse
└── main.ts
```

Los directorios `reservation` y `shared/presentation/sse` son limites objetivo; el codigo actual mantiene el controller SSE junto al modulo de asientos hasta que el contrato se extraiga como componente compartido.

## 27. Decisiones arquitectonicas

| Problema | Decision | Motivo | Impacto |
| --- | --- | --- | --- |
| Estado inicial del mapa | Snapshot REST antes de SSE | SSE solo entrega cambios | Angular puede reconstruir estado tras reconexion |
| Comunicacion interna | EventBus y subscribers | No acoplar modulos a transporte | SSE puede cambiar sin tocar dominio |
| Persistencia compartida | PostgreSQL como fuente de verdad | Consistencia entre instancias y modulos | Requiere migraciones, pool y backups |
| Hold concurrente | Operacion atomica del repositorio PostgreSQL | Evitar doble reserva | El mutex en memoria solo sirve para tests |
| Hold temporal | Estado persistido, no transaccion abierta | El hold dura minutos | Scheduler idempotente |
| Contrato frontend | Envelope SSE versionado | Separar dominio de API | Permite evolucionar DTOs |
| Pago y ocupacion | Coordinacion idempotente | Pueden fallar por separado | Saga/compensacion futura |
| Broker | Bus en proceso en MVP, Outbox/Kafka despues | Kafka no es requisito para realtime | PostgreSQL sigue siendo fuente de verdad |
| Despliegue | Modular Monolith | Limites claros sin complejidad prematura | Extraccion futura por bounded context |

## 28. Validacion final

- Dos usuarios pueden intentar el mismo hold: **si**, el port lo expresa y la persistencia debe resolverlo atomicamente.
- Solo uno obtiene el hold y el segundo recibe `409 Conflict`: **si**.
- Angular obtiene snapshot inicial: **si**, `GET /api/v1/flights/{id}/seats`.
- Angular se conecta a SSE: **si**, `GET /api/v1/flights/{id}/events`.
- Angular recibe `SeatHeld`, `SeatReleased`, `SeatHoldExpired` y `SeatOccupied`: **si**, mediante el envelope versionado.
- Todo evento realtime esta asociado a `flightId`: **si**.
- Multiples clientes SSE por vuelo: **si**, responsabilidad del `RealtimeHub`.
- Dominio independiente de NestJS y SSE: **si**, mediante ports y mappers.
- Evolucion a Outbox/Kafka: **si**, mediante `EventBusPort`/adapter.

Los adapters PostgreSQL, el pool, el esquema inicial, las transacciones y el
lock atomico ya forman parte del backend. Antes de produccion deben ejecutarse
las migraciones en cada entorno, agregar pruebas de integracion contra
PostgreSQL y completar los casos de uso del bounded context `reservation`, que
tambien debe persistir en PostgreSQL antes de habilitar confirmaciones reales.
