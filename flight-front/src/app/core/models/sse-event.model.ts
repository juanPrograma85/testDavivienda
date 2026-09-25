export interface SseEvent<TPayload> {
  eventId: string;
  type: string;
  version: number;
  occurredAt: string;
  flightId: string;
  aggregateId: string;
  payload: TPayload;
}