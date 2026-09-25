import { InvalidArgumentError } from '@shared/domain/errors/domain-error';
import { CabinClass } from './seat-status';

export interface CabinSection {
  cabinClass: CabinClass;
  firstRow: number;
  lastRow: number;
  columns: string[];
}

/** Describes the physical seat layout of an aircraft. */
export class CabinLayout {
  private constructor(readonly sections: readonly CabinSection[]) {}

  static create(sections: CabinSection[]): CabinLayout {
    if (sections.length === 0) {
      throw new InvalidArgumentError('A cabin layout needs at least one section');
    }
    for (const section of sections) {
      if (section.firstRow < 1 || section.lastRow < section.firstRow) {
        throw new InvalidArgumentError(
          `Invalid row range ${section.firstRow}-${section.lastRow}`,
        );
      }
      if (section.columns.length === 0) {
        throw new InvalidArgumentError('A cabin section needs at least one column');
      }
    }
    return new CabinLayout(sections);
  }

  /** Default narrow-body configuration used when an aircraft has no custom map. */
  static standardNarrowBody(): CabinLayout {
    return CabinLayout.create([
      {
        cabinClass: CabinClass.Business,
        firstRow: 1,
        lastRow: 3,
        columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      },
      {
        cabinClass: CabinClass.PremiumEconomy,
        firstRow: 4,
        lastRow: 8,
        columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      },
      {
        cabinClass: CabinClass.Economy,
        firstRow: 9,
        lastRow: 30,
        columns: ['A', 'B', 'C', 'D', 'E', 'F'],
      },
    ]);
  }
}
