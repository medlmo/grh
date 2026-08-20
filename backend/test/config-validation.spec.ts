import { validateConfiguration } from '../src/config/config.validation';

describe('validateConfiguration', () => {
  it('refuse un secret JWT absent ou trop court', () => {
    expect(() => validateConfiguration({})).toThrow(/JWT_SECRET/);
    expect(() => validateConfiguration({ JWT_SECRET: 'trop-court' })).toThrow(/32 caractères/);
  });

  it('normalise et conserve un secret JWT valide', () => {
    const result = validateConfiguration({
      JWT_SECRET: '  test-secret-with-at-least-32-characters-long  ',
      PORT: '4000',
    });

    expect(result.JWT_SECRET).toBe('test-secret-with-at-least-32-characters-long');
    expect(result.PORT).toBe('4000');
  });

  it('ne fournit aucun fallback lorsque JWT_SECRET est absent', () => {
    expect(() => validateConfiguration({ JWT_SECRET: undefined })).toThrow();
  });
});