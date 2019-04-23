import { TestBed, inject } from '@angular/core/testing';

import { ParsingStringService } from './parsing-string.service';

describe('ParsingStringService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ParsingStringService]
    });
  });

  it('should be created', inject([ParsingStringService], (service: ParsingStringService) => {
    expect(service).toBeTruthy();
  }));
});
