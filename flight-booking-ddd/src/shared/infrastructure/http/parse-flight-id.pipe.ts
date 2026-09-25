import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const FLIGHT_ID_PATTERN = /^[A-Z]{2,3}\d{3}$/;

@Injectable()
export class ParseFlightIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const normalized = value?.trim().toUpperCase() ?? '';
    if (!FLIGHT_ID_PATTERN.test(normalized)) {
      throw new BadRequestException(
        'flightId must contain 2-3 uppercase letters followed by 3 digits',
      );
    }
    return normalized;
  }
}
