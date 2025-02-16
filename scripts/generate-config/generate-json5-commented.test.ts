import { expect, test } from 'vitest';
import { z } from 'zod';
import { generateJson5Commented } from './generate-json5-commented';


test('Generate commented JSON5', () => {
  const shema = z.object({
    host: z.string().min(1, "Host is required").describe("desc host"),
    port: z.number().int().positive("Port must be a positive integer").default(21114).describe("desc port"),
    password: z.string().describe("desc password"),
    autoReconnectDelay: z
      .number()
      .min(1000, "AutoReconnectDelay minimum is 1000ms") // don't DOS yourself
      .nonnegative("AutoReconnectDelay must be a non-negative number")
      .default(5000).describe("desc autoReconnectDelay"),
    subObj: z.object({
      subTest: z.number().describe("desc subTest"),
      subProp: z.number().int().positive("SubProp must be a positive integer").default(33).describe("desc subProp"),
      port: z.number().describe("desc port"),
      sub2: z.object({
        sub3: z.number().describe("desc sub3"),
      }).describe("desc sub2"),
    }).describe("desc subObj"),
  }).describe("Top comment\nSecond line");

  const json5WithComments = generateJson5Commented(shema);
  expect(json5WithComments).toMatchSnapshot();
});
