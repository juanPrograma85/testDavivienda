import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminApiKeyGuard } from '@shared/infrastructure/security/admin-api-key.guard';
import { ParseFlightIdPipe } from '@shared/infrastructure/http/parse-flight-id.pipe';
import { SearchFlightsUseCase } from '../../application/use-cases/search-flights.use-case';
import { GetFlightUseCase } from '../../application/use-cases/get-flight.use-case';
import { ChangeFlightStatusUseCase } from '../../application/use-cases/change-flight-status.use-case';
import { SearchFlightsQueryDto } from './dto/search-flights.query.dto';
import { ChangeFlightStatusDto } from './dto/change-flight-status.dto';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Flights')
@Controller('flights')
export class FlightController {
  constructor(
    private readonly searchFlights: SearchFlightsUseCase,
    private readonly getFlight: GetFlightUseCase,
    private readonly changeFlightStatus: ChangeFlightStatusUseCase,
  ) {}

  @ApiOperation({ summary: 'Buscar vuelos por origen, destino y fecha' })
  @ApiQuery({ name: 'origin', required: false, example: 'BOG', description: 'Codigo IATA de origen.' })
  @ApiQuery({ name: 'destination', required: false, example: 'MEX', description: 'Codigo IATA de destino.' })
  @ApiQuery({ name: 'departureDate', required: false, example: '2026-10-01' })
  @ApiQuery({ name: 'statuses', required: false, example: 'SCHEDULED,DELAYED' })
  @ApiQuery({ name: 'maxFare', required: false, example: 500 })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['departure', 'price'], example: 'departure' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Vuelos coincidentes con tarifas, horarios y estado.' })
  @Get()
  search(@Query() query: SearchFlightsQueryDto) {
    return this.searchFlights.execute(query);
  }

  @Get(':flightId')
  @ApiOperation({ summary: 'Obtener el detalle de un vuelo' })
  @ApiParam({ name: 'flightId', schema: { type: 'string', pattern: '^[A-Z]{2,3}\\d{3}$' }, example: 'THA001' })
  @ApiResponse({ status: 200, description: 'Detalle del vuelo.' })
  findOne(@Param('flightId', ParseFlightIdPipe) flightId: string) {
    return this.getFlight.execute(flightId);
  }

  @UseGuards(AdminApiKeyGuard)
  @ApiOperation({ summary: 'Cambiar el estado operativo de un vuelo' })
  @ApiParam({ name: 'flightId', schema: { type: 'string', pattern: '^[A-Z]{2,3}\\d{3}$' }, example: 'THA001' })
  @ApiBody({ type: ChangeFlightStatusDto, examples: { delay: { value: { status: 'DELAYED', reason: 'Weather conditions' } } } })
  @ApiResponse({ status: 200, description: 'Estado actualizado y evento realtime publicado.' })
  @ApiResponse({ status: 401, description: 'Falta la API key administrativa.' })
  @Patch(':flightId/status')
  changeStatus(
    @Param('flightId', ParseFlightIdPipe) flightId: string,
    @Body() body: ChangeFlightStatusDto,
  ) {
    return this.changeFlightStatus.execute({ flightId, ...body });
  }
}
