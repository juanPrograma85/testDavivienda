import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaymentCardDto {
  @ApiProperty({ example: '4111111111111111' })
  @IsString()
  @Matches(/^[\d\s-]{13,25}$/, { message: 'pan has an invalid format' })
  pan!: string;

  @ApiProperty({ example: '123', minLength: 3, maxLength: 4 })
  @IsString()
  @Matches(/^\d{3,4}$/, { message: 'cvv must contain 3 or 4 digits' })
  cvv!: string;

  @ApiProperty({ example: 12, minimum: 1, maximum: 12 })
  @IsInt()
  @Min(1)
  @Max(12)
  expiryMonth!: number;

  @ApiProperty({ example: 2030, minimum: 2026 })
  @IsInt()
  @Min(2026)
  expiryYear!: number;

  @ApiProperty({ example: 'Maria Perez', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120)
  holderName!: string;
}

export class ProcessPaymentDto {
  @ApiProperty({ example: 'b2f5c434-e8e4-4f72-8738-4749b27cd68c' })
  @IsUUID('4')
  reservationId!: string;

  @ApiProperty({
    example: 42050,
    minimum: 1,
    description: 'Valor total en pesos colombianos (COP).',
  })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ type: PaymentCardDto })
  @ValidateNested()
  @Type(() => PaymentCardDto)
  card!: PaymentCardDto;
}