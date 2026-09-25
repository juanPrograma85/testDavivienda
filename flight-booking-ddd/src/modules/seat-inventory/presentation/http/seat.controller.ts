import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ParseFlightIdPipe } from '@shared/infrastructure/http/parse-flight-id.pipe';
import { GetSeatMapUseCase } from '../../application/use-cases/get-seat-map.use-case';
import { HoldSeatUseCase } from '../../application/use-cases/hold-seat.use-case';
import { ReleaseSeatUseCase } from '../../application/use-cases/release-seat.use-case';
import { HoldSeatDto, ReleaseSeatDto } from './dto/hold-seat.dto';

@ApiTags('Seats')
@Controller('flights/:flightId/seats')
export class SeatController {
  constructor(
    private readonly getSeatMap: GetSeatMapUseCase,
    private readonly holdSeat: HoldSeatUseCase,
    private readonly releaseSeat: ReleaseSeatUseCase,
  ) {}

  /** Historia 2: mapa interactivo de la aeronave. */
  @ApiOperation({ summary: 'Obtener el snapshot actual del mapa de asientos' })
  @ApiParam({ name: 'flightId', schema: { type: 'string', pattern: '^[A-Z]{2,3}\\d{3}$' }, example: 'THA001' })
  @ApiResponse({ status: 200, description: 'Mapa y ocupacion actuales.' })
  @Get()
  seatMap(@Param('flightId', ParseFlightIdPipe) flightId: string) {
    return this.getSeatMap.execute(flightId);
  }

  /**
   * Historia 2: bloqueo temporal. Rate limited on its own because it is the
   * endpoint an attacker would abuse to exhaust the cabin.
   */
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Bloquear temporalmente un asiento disponible' })
  @ApiParam({ name: 'seatNumber', example: '12A' })
  @ApiBody({
    type: HoldSeatDto,
    examples: {
      hold: {
        value: { userName: 'Maria Perez', userDocument: '1020304050' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Hold creado con fecha de expiracion.' })
  @ApiResponse({ status: 409, description: 'El asiento ya esta bloqueado u ocupado.' })
  @Post(':seatNumber/hold')
  @HttpCode(HttpStatus.CREATED)
  hold(
    @Param('flightId', ParseFlightIdPipe) flightId: string,
    @Param('seatNumber') seatNumber: string,
    @Body() body: HoldSeatDto,
  ) {
    return this.holdSeat.execute({ flightId, seatNumber, ...body });
  }

  @Post(':seatNumber/release')
  @ApiOperation({ summary: 'Liberar un hold temporal' })
  @ApiParam({ name: 'seatNumber', example: '12A' })
  @ApiBody({
    type: ReleaseSeatDto,
    examples: { release: { value: { userDocument: '1020304050' } } },
  })
  @ApiResponse({ status: 200, description: 'Asiento liberado.' })
  @HttpCode(HttpStatus.OK)
  release(
    @Param('flightId', ParseFlightIdPipe) flightId: string,
    @Param('seatNumber') seatNumber: string,
    @Body() body: ReleaseSeatDto,
  ) {
    return this.releaseSeat.execute({ flightId, seatNumber, ...body });
  }
}
