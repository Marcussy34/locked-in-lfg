import { describe, it, expect } from 'vitest';
import { ApiError } from '@/services/api/errors';

describe('ApiError', () => {
  it('constructor sets message, status, and code', () => {
    const error = new ApiError('Not found', 404, 'RESOURCE_NOT_FOUND');

    expect(error.message).toBe('Not found');
    expect(error.status).toBe(404);
    expect(error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('sets name to ApiError', () => {
    const error = new ApiError('Test', 500);
    expect(error.name).toBe('ApiError');
  });

  it('code is optional', () => {
    const error = new ApiError('Server error', 500);
    expect(error.code).toBeUndefined();
  });

  it('is an instance of Error', () => {
    const error = new ApiError('Bad request', 400);
    expect(error).toBeInstanceOf(Error);
  });

  it('status 0 for network errors', () => {
    const error = new ApiError('Network failed', 0, 'NETWORK_ERROR');
    expect(error.status).toBe(0);
    expect(error.code).toBe('NETWORK_ERROR');
  });
});
