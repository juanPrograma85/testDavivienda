import { DomainEventHandler } from '@shared/application/ports/event-bus.port';
import { PaymentSettledEvent } from '@modules/payment/domain/events/payment-settled.event';
import { PaymentStatus } from '@modules/payment/domain/model/payment-status';
import { PaymentSettledSubscriber } from './payment-settled.subscriber';

describe('PaymentSettledSubscriber', () => {
  const findByHoldId = jest.fn();
  const execute = jest.fn();
  let handler: DomainEventHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    const subscriber = new PaymentSettledSubscriber(
      { subscribe: (_name: string, callback: DomainEventHandler) => { handler = callback; } } as never,
      { findByHoldId } as never,
      { execute } as never,
    );
    subscriber.onModuleInit();
  });

  it('confirms the held seat after an authorized payment', async () => {
    findByHoldId.mockResolvedValue({ flightId: 'THA001', seatNumber: '2A' });

    await handler(new PaymentSettledEvent('payment-1', 'hold-1', PaymentStatus.Authorized, 100, 'COP'));

    expect(findByHoldId).toHaveBeenCalledWith('hold-1');
    expect(execute).toHaveBeenCalledWith({
      flightId: 'THA001', seatNumber: '2A', holdId: 'hold-1', reservationId: 'hold-1',
    });
  });

  it('does not occupy a seat when payment is declined', async () => {
    await handler(new PaymentSettledEvent('payment-2', 'hold-2', PaymentStatus.Declined, 100, 'COP'));

    expect(findByHoldId).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});