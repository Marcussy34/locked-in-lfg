import { describe, it, expect } from 'vitest';
import { HttpError, badRequest, unauthorized, notFound } from '../../../src/lib/errors.mjs';

describe('errors', () => {
  describe('HttpError constructor', () => {
    it('sets statusCode, message, and code correctly', () => {
      const error = new HttpError(418, 'I am a teapot', 'TEAPOT');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(HttpError);
      expect(error.statusCode).toBe(418);
      expect(error.message).toBe('I am a teapot');
      expect(error.code).toBe('TEAPOT');
      expect(error.name).toBe('HttpError');
    });

    it('defaults code to INTERNAL_ERROR when not provided', () => {
      const error = new HttpError(500, 'Something went wrong');

      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('badRequest', () => {
    it('returns HttpError with status 400', () => {
      const error = badRequest('Invalid input');

      expect(error).toBeInstanceOf(HttpError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('accepts custom code', () => {
      const error = badRequest('Missing field', 'MISSING_FIELD');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MISSING_FIELD');
    });
  });

  describe('unauthorized', () => {
    it('returns HttpError with status 401', () => {
      const error = unauthorized('Not authenticated');

      expect(error).toBeInstanceOf(HttpError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Not authenticated');
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('accepts custom code', () => {
      const error = unauthorized('Token expired', 'TOKEN_EXPIRED');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('notFound', () => {
    it('returns HttpError with status 404', () => {
      const error = notFound('Resource not found');

      expect(error).toBeInstanceOf(HttpError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Resource not found');
      expect(error.code).toBe('NOT_FOUND');
    });

    it('accepts custom code', () => {
      const error = notFound('Lesson missing', 'LESSON_NOT_FOUND');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('LESSON_NOT_FOUND');
    });
  });
});
