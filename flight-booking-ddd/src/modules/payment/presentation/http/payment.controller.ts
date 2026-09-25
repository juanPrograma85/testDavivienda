import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../../application/services/payment.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Procesar y persistir el pago de una reserva',
    description:
      'Publica PaymentSettled despues de que el gateway autoriza o rechaza el pago.',
  })
  @ApiResponse({ status: 201, description: 'Pago procesado y persistido.' })
  @ApiResponse({ status: 400, description: 'Datos de pago invalidos.' })
  @ApiResponse({ status: 409, description: 'Regla de pago incumplida.' })
  process(@Body() body: ProcessPaymentDto) {
    return this.payments.charge(body);
  }
}