import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SseEvent } from '../models/sse-event.model';

@Injectable({ providedIn: 'root' })
export class SseService {
  connect<TPayload>(url: string, eventTypes: readonly string[]): Observable<SseEvent<TPayload>> {
    return new Observable<SseEvent<TPayload>>((subscriber) => {
      const source = new EventSource(url);
      const receive = (message: MessageEvent<string>) => {
        try {
          subscriber.next(JSON.parse(message.data) as SseEvent<TPayload>);
        } catch {
          subscriber.error(new Error('El servidor envió un evento SSE inválido.'));
        }
      };

      source.onmessage = receive;
      eventTypes.forEach((eventType) => source.addEventListener(eventType, receive as EventListener));
      source.onerror = () => subscriber.error(new Error('La conexión de eventos fue interrumpida.'));

      return () => {
        eventTypes.forEach((eventType) => source.removeEventListener(eventType, receive as EventListener));
        source.close();
      };
    });
  }
}