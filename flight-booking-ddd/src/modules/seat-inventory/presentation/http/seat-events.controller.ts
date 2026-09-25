import { Controller, MessageEvent, Param, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApiOperation, ApiParam, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RealtimeHub } from '@shared/infrastructure/realtime/realtime-hub';
import { ParseFlightIdPipe } from '@shared/infrastructure/http/parse-flight-id.pipe';
import {
  SeatHeldEvent,
  SeatHoldExpiredEvent,
  SeatOccupiedEvent,
  SeatReleasedEvent,
} from '../../domain/events/seat.events';
import { OccupancyChangedEvent } from '../../domain/events/occupancy-changed.event';

const SEAT_EVENTS: ReadonlySet<string> = new Set([
  SeatHeldEvent.NAME,
  SeatHoldExpiredEvent.NAME,
  SeatReleasedEvent.NAME,
  SeatOccupiedEvent.NAME,
]);

/**
 * Historias 2, 3 y 4 (tiempo real): un único canal SSE por vuelo que difunde
 * bloqueos, liberaciones, ocupaciones y el snapshot de ocupación.
 *
 * GET /api/v1/flights/:flightId/events
 */
@ApiTags('Realtime')
@Controller('flights/:flightId/events')
export class SeatEventsController {
  constructor(private readonly realtime: RealtimeHub) {}

  @Sse()
  @ApiOperation({ summary: 'Abrir stream SSE de cambios de asientos del vuelo' })
  @ApiParam({ name: 'flightId', schema: { type: 'string', pattern: '^[A-Z]{2,3}\\d{3}$' }, example: 'THA001' })
  @ApiProduces('text/event-stream')
  @ApiResponse({ status: 200, description: 'Eventos SeatHeld, SeatReleased, SeatHoldExpired y SeatOccupied.' })
  stream(
    @Param('flightId', ParseFlightIdPipe) flightId: string,
  ): Observable<MessageEvent> {
    return this.realtime.stream(
      (event) =>
        event.aggregateId === flightId &&
        (SEAT_EVENTS.has(event.eventName) ||
          event.eventName === OccupancyChangedEvent.NAME),
    );
  }
}
