import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { EVENT_BUS, EventBusPort } from '@shared/application/ports/event-bus.port';
import { DomainEvent } from '@shared/domain/events/domain-event';
import {
  SEAT_MAP_REPOSITORY,
  SeatMapRepositoryPort,
} from '../../domain/ports/seat-map.repository';
import { OccupySeatUseCase } from '../use-cases/occupy-seat.use-case';

@Injectable()
export class PaymentSettledSubscriber implements OnModuleInit {
  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: EventBusPort,
    @Inject(SEAT_MAP_REPOSITORY) private readonly seatMaps: SeatMapRepositoryPort,
    private readonly occupySeat: OccupySeatUseCase,
  ) {}

  onModuleInit(): void {
    this.eventBus.subscribe('payment.settled', (event) => this.handle(event));
  }

  private async handle(event: DomainEvent): Promise<void> {
    const payload = event.toPrimitives();
    if (payload.status !== 'AUTHORIZED' || typeof payload.reservationId !== 'string') {
      return;
    }

    const seat = await this.seatMaps.findByHoldId(payload.reservationId);
    if (!seat) return;

    await this.occupySeat.execute({
      ...seat,
      holdId: payload.reservationId,
      reservationId: payload.reservationId,
    });
  }
}