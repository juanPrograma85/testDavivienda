import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { FlightStatus } from '../../../domain/model/flight-status';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchFlightsQueryDto {
  @ApiPropertyOptional({ example: 'BOG', description: 'Codigo IATA de origen.' })
  @IsOptional()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @Matches(/^[A-Z]{3}$/, { message: 'origin must be a 3-letter IATA code' })
  origin?: string;

  @IsOptional()
  @Transform(({ value }) => String(value).trim().toUpperCase())
  @Matches(/^[A-Z]{3}$/, { message: 'destination must be a 3-letter IATA code' })
  destination?: string;
  @ApiPropertyOptional({ example: '2026-10-01', description: 'Fecha de salida en formato YYYY-MM-DD.' })

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'departureDate must be YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'departureDate must be YYYY-MM-DD' })
  departureDate?: string;
  @ApiPropertyOptional({ enum: FlightStatus, isArray: true, example: [FlightStatus.Scheduled] })

  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : String(value).split(','),
  )
  @IsArray()
  @IsEnum(FlightStatus, { each: true })
  statuses?: FlightStatus[];
  @ApiPropertyOptional({ example: 500, description: 'Tarifa maxima en unidades monetarias.' })

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  maxFare?: number;
  @ApiPropertyOptional({ enum: ['departure', 'price'], example: 'departure' })

  @IsOptional()
  @IsEnum(['departure', 'price'])
  sortBy?: 'departure' | 'price';
  @ApiPropertyOptional({ example: 1, default: 1 })

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional({ example: 20, default: 20, maximum: 50 })

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
