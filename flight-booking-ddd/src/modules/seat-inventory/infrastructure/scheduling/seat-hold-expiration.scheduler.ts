import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ExpireSeatHoldsUseCase } from '../../application/use-cases/expire-seat-holds.use-case';

const SWEEP_INTERVAL_MS = 10_000;

@Injectable()
export class SeatHoldExpirationScheduler {
  private readonly logger = new Logger(SeatHoldExpirationScheduler.name);
  private running = false;

  constructor(private readonly expireSeatHolds: ExpireSeatHoldsUseCase) {}

  @Interval('seat-hold-expiration', SWEEP_INTERVAL_MS)
  async sweep(): Promise<void> {
    if (this.running) return; // Avoid overlapping sweeps on slow backends.
    this.running = true;
    try {
      await this.expireSeatHolds.execute();
    } catch (error) {
      this.logger.error(
        'Seat hold expiration sweep failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
