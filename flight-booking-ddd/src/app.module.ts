import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnvironment } from './config/environment';
import { SharedModule } from './shared/shared.module';
import { FlightModule } from './modules/flight/flight.module';
import { SeatInventoryModule } from './modules/seat-inventory/seat-inventory.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    SharedModule,
    FlightModule,
    SeatInventoryModule,
    PaymentModule,
  ],
})
export class AppModule {}