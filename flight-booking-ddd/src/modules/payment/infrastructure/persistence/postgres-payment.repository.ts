import { Injectable } from '@nestjs/common';
import { PostgresDatabase } from '@shared/infrastructure/persistence/postgres-database';
import { UniqueId } from '@shared/domain/model/unique-id';
import { Money } from '@shared/domain/model/money';
import { CardDetails } from '../../domain/model/card-details';
import { Payment } from '../../domain/model/payment';
import { PaymentStatus } from '../../domain/model/payment-status';
import { PaymentRepositoryPort } from '../../domain/ports/payment.repository';

interface PaymentRow {
  id: string;
  reservation_id: string;
  amount_in_cents: number;
  currency: string;
  card_brand: string;
  card_last4: string;
  card_expiry_month: number;
  card_expiry_year: number;
  card_holder_name: string;
  created_at: Date;
  status: PaymentStatus;
  authorization_code: string | null;
  failure_reason: string | null;
}

@Injectable()
export class PostgresPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly database: PostgresDatabase) {}

  async findById(id: UniqueId): Promise<Payment | null> {
    const result = await this.database.query<PaymentRow>(
      'SELECT * FROM payment.payments WHERE id = $1',
      [id.value],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async findByReservationId(reservationId: string): Promise<Payment | null> {
    const result = await this.database.query<PaymentRow>(
      'SELECT * FROM payment.payments WHERE reservation_id = $1',
      [reservationId],
    );
    return result.rows[0] ? this.toDomain(result.rows[0]) : null;
  }

  async save(payment: Payment): Promise<void> {
    await this.database.query(
      `INSERT INTO payment.payments (id, reservation_id, amount_in_cents, currency, card_brand, card_last4,
       card_expiry_month, card_expiry_year, card_holder_name, created_at, status, authorization_code, failure_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status,
      authorization_code = EXCLUDED.authorization_code, failure_reason = EXCLUDED.failure_reason,
      updated_at = CURRENT_TIMESTAMP`,
      [
        payment.id.value,
        payment.reservationId,
        payment.amount.amountInCents,
        payment.amount.currency,
        payment.card.brand,
        payment.card.last4,
        payment.card.expiryMonth,
        payment.card.expiryYear,
        payment.card.holderName,
        payment.createdAt,
        payment.status,
        payment.authorizationCode ?? null,
        payment.failureReason ?? null,
      ],
    );
  }

  private toDomain(row: PaymentRow): Payment {
    return Payment.rehydrate({
      id: UniqueId.fromString(row.id),
      reservationId: row.reservation_id,
      amount: Money.fromCents(Number(row.amount_in_cents), row.currency),
      card: CardDetails.rehydrate({
        brand: row.card_brand,
        last4: row.card_last4,
        expiryMonth: row.card_expiry_month,
        expiryYear: row.card_expiry_year,
        holderName: row.card_holder_name,
      }),
      createdAt: new Date(row.created_at),
      status: row.status,
      authorizationCode: row.authorization_code ?? undefined,
      failureReason: row.failure_reason ?? undefined,
    });
  }
}