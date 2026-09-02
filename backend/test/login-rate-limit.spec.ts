import { ExecutionContext, HttpException } from '@nestjs/common';
import { LoginRateLimitGuard } from '../src/auth/guards/login-rate-limit.guard';

function makeContext(ip = '192.0.2.10', email = 'user@example.com'): ExecutionContext {
  const response = { setHeader: jest.fn() };
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip, body: { email }, socket: { remoteAddress: ip } }),
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

describe('LoginRateLimitGuard', () => {
  const originalMax = process.env.AUTH_LOGIN_RATE_LIMIT_MAX;
  const originalIpMax = process.env.AUTH_LOGIN_RATE_LIMIT_IP_MAX;
  const originalWindow = process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS;

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalMax === undefined) delete process.env.AUTH_LOGIN_RATE_LIMIT_MAX;
    else process.env.AUTH_LOGIN_RATE_LIMIT_MAX = originalMax;
    if (originalIpMax === undefined) delete process.env.AUTH_LOGIN_RATE_LIMIT_IP_MAX;
    else process.env.AUTH_LOGIN_RATE_LIMIT_IP_MAX = originalIpMax;
    if (originalWindow === undefined) delete process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS;
    else process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = originalWindow;
  });

  it('retourne 429 et Retry-After après la limite configurée', () => {
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '2';
    process.env.AUTH_LOGIN_RATE_LIMIT_IP_MAX = '10';
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = '60000';
    const guard = new LoginRateLimitGuard();
    const first = makeContext();
    const second = makeContext();
    const third = makeContext();

    expect(guard.canActivate(first)).toBe(true);
    expect(guard.canActivate(second)).toBe(true);
    expect(() => guard.canActivate(third)).toThrow(HttpException);

    const response = third.switchToHttp().getResponse<{ setHeader: jest.Mock }>();
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });
});