import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HoldSeatDto {
  @ApiProperty({
    example: 'Maria Perez',
    minLength: 2,
    maxLength: 120,
    description: 'Nombre de la persona que intenta reservar el asiento.',
  })
  @IsString()
  @Length(2, 120)
  @Matches(/^[\p{L}][\p{L}\s.'-]*$/u, {
    message: 'userName contains invalid characters',
  })
  userName!: string;

  @ApiProperty({
    example: '1020304050',
    minLength: 5,
    maxLength: 20,
    description: 'Numero de cedula del usuario que intenta reservar el asiento.',
  })
  @IsString()
  @Length(5, 20)
  @Matches(/^\d+$/, { message: 'userDocument must contain only digits' })
  userDocument!: string;
}

export class ReleaseSeatDto {
  @ApiProperty({ example: '1020304050', minLength: 5, maxLength: 20 })
  @IsString()
  @Length(5, 20)
  @Matches(/^\d+$/, { message: 'userDocument must contain only digits' })
  userDocument!: string;
}
