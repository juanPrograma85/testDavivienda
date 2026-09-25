import { TestBed } from '@angular/core/testing';
import { EMPTY } from 'rxjs';
import { SseService } from '../../../core/services/sse.service';
import { FlightEventsService } from './flight-events';

describe('FlightEventsService', () => {
  it('connects to the event stream for the requested flight', () => {
    let receivedUrl = '';
    const sse = {
      connect: (url: string) => {
        receivedUrl = url;
        return EMPTY;
      },
    };

    TestBed.configureTestingModule({
      providers: [FlightEventsService, { provide: SseService, useValue: sse }],
    });

    TestBed.inject(FlightEventsService).connect('THA001', () => undefined).subscribe();

    expect(receivedUrl).toBe('/api/v1/flights/THA001/events');
  });
});