import { describe, it, expect, jest } from '@jest/globals';
import { retryWithExponentialBackoff } from './retry-with-eponential-backoff';


describe('retryWithExponentialBackoff', () => {
  let mockLogger = {
    info: jest.fn().mockImplementation(console.log),
    // Hide it to avoid confusion in CI, enable it if you change this test to better understand what is happening.
    error: jest.fn(),//.mockImplementation(console.error),
  };

  it('should execute promise', async () => {
    const mockFn = jest.fn<any>().mockResolvedValue(undefined);
    await retryWithExponentialBackoff(mockFn, 3, mockLogger as any, () => false, () => true);
    expect(mockFn).toHaveBeenCalled();
  });

  it('should retry promise', async () => {
    const mockFn = jest.fn<any>()
      .mockRejectedValueOnce(new Error('first error'))
      .mockRejectedValueOnce(new Error('second error'))
      .mockResolvedValue(undefined);
    await retryWithExponentialBackoff(mockFn, 3, mockLogger as any, () => false, () => true);
    expect(mockLogger.error).toHaveBeenNthCalledWith(1, 'Error in retryWithExponentialBackoff: first error');
    expect(mockLogger.info).toHaveBeenNthCalledWith(1, expect.stringContaining('Retrying (attempt 1) in'));
    expect(mockLogger.error).toHaveBeenNthCalledWith(2, 'Error in retryWithExponentialBackoff: second error');
    expect(mockLogger.info).toHaveBeenNthCalledWith(2, expect.stringContaining('Retrying (attempt 2) in'));
    expect(mockFn).toHaveBeenCalled();
  });

});
