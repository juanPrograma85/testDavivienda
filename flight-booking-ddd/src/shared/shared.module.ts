import { Global, Module } from '@nestjs/common';
import { EVENT_BUS } from '@shared/application/ports/event-bus.port';
import { CLOCK } from '@shared/application/ports/clock.port';
import { InMemoryEventBus } from './infrastructure/events/in-memory-event-bus';
import { RealtimeHub } from './infrastructure/realtime/realtime-hub';
import { SystemClock } from './infrastructure/time/system-clock';
import { AdminApiKeyGuard } from './infrastructure/security/admin-api-key.guard';
import { PostgresDatabase } from './infrastructure/persistence/postgres-database';

/**
 * Shared kernel. Exposes only stable abstractions; modules never import each
 * other's internals, they collaborate through these ports.
 */
@Global()
@Module({
  providers: [
    InMemoryEventBus,
    { provide: EVENT_BUS, useExisting: InMemoryEventBus },
    { provide: CLOCK, useClass: SystemClock },
    RealtimeHub,
    AdminApiKeyGuard,
    PostgresDatabase,
  ],
  exports: [InMemoryEventBus, EVENT_BUS, CLOCK, RealtimeHub, AdminApiKeyGuard, PostgresDatabase],
})
export class SharedModule {}
