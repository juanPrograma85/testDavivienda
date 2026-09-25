export interface SseEventEnvelope {
  eventId: string;
  type: string;
  version: number;
  occurredAt: string;
  flightId: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}