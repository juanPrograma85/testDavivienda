import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Query,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RealtimeHub } from '@shared/infrastructure/realtime/realtime-hub';
import { ParseFlightIdPipe } from '@shared/infrastructure/http/parse-flight-id.pipe';
import { OccupancyChangedEvent } from '../../domain/events/occupancy-changed.event';
import { GetFlightOccupancyUseCase } from '../../application/use-cases/get-flight-occupancy.use-case';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getOccupancy: GetFlightOccupancyUseCase,
    private readonly realtime: RealtimeHub,
  ) {}

  @Get('flights/:flightId')
  @ApiOperation({ summary: 'Obtener snapshot de ocupacion del vuelo' })
  snapshot(@Param('flightId', ParseFlightIdPipe) flightId: string) {
    return this.getOccupancy.execute(flightId);
  }

  @Sse('stream')
  stream(@Query('flightId') flightId?: string): Observable<MessageEvent> {
    return this.realtime.stream(
      (event) =>
        event.eventName === OccupancyChangedEvent.NAME &&
        (!flightId || event.aggregateId === flightId),
    );
  }
}
