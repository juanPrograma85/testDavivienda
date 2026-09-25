import { Controller, MessageEvent, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RealtimeHub } from '@shared/infrastructure/realtime/realtime-hub';
import { FlightStatusChangedEvent } from '../../domain/events/flight-status-changed.event';
import { ApiOperation, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

/**
 * Historia 1 (tiempo real): el listado de resultados se actualiza vía SSE cuando
 * un vuelo cambia de estado, sin recargar la página.
 *
 * GET /api/v1/flights/events
 * GET /api/v1/flights/events?flightId=THA001
 */
@ApiTags('Realtime')
@Controller('flights')
export class FlightEventsController {
  constructor(private readonly realtime: RealtimeHub) {}

  @Sse('stream')
  @ApiOperation({ summary: 'Abrir stream SSE de cambios de estado de vuelos' })
  @ApiQuery({ name: 'flightId', required: false, schema: { type: 'string', pattern: '^[A-Z]{2,3}\\d{3}$' }, example: 'THA001' })
  @ApiProduces('text/event-stream')
  @ApiResponse({ status: 200, description: 'Eventos FlightStatusChanged.' })
  stream(@Query('flightId') flightId?: string): Observable<MessageEvent> {
    return this.realtime.stream(
      (event) =>
        event.eventName === FlightStatusChangedEvent.NAME &&
        (!flightId || event.aggregateId === flightId),
    );
  }
}
