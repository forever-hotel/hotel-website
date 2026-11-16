import { errorName } from './error-name';

describe('errorName', () => {
  it('should return the class name given an Error', () => {
    // Act & Assert
    expect(errorName(new TypeError('secret detail'))).toBe('TypeError');
  });

  it('should return UnknownError given a value that is not an Error', () => {
    // Act & Assert
    expect(errorName('boom')).toBe('UnknownError');
  });
});
