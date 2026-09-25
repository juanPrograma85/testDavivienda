import { UniqueId } from '@shared/domain/model/unique-id';
import { Payment } from '../model/payment';

export interface PaymentRepositoryPort {
  findById(id: UniqueId): Promise<Payment | null>;
  findByReservationId(reservationId: string): Promise<Payment | null>;
  save(payment: Payment): Promise<void>;
  withReservationLock<T>(
    reservationId: string,
    mutation: () => Promise<T>,
  ): Promise<T>;
}

export const PAYMENT_REPOSITORY = Symbol('PaymentRepositoryPort');
