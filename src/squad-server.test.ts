import {describe, expect, test} from '@jest/globals';

const sum = (a: number, b: number): number => a + b;

test('adds 1 and 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
