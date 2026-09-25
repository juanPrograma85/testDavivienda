import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FlightStatus } from '../../../domain/model/flight-status';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangeFlightStatusDto {
  @ApiProperty({ enum: FlightStatus, example: FlightStatus.Delayed })
  @IsEnum(FlightStatus)
  status!: FlightStatus;

  @ApiPropertyOptional({ example: 'Weather conditions' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
