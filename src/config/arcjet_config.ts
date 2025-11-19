import arcjet, { detectBot, validateEmail } from '@arcjet/next';

export const aj = arcjet({
  key: process.env.ARCJET_KEY as string,
  rules: [
    validateEmail({
      mode: 'LIVE',
      deny: ['DISPOSABLE', 'INVALID', 'NO_MX_RECORDS'],
    }),
  ],
});
