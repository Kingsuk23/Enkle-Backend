import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from './database';

export const max_wrong_attempts_by_ip_par_day = 4;
export const max_consecutive_fails_by_email_and_ip = 4;

export const limiter_slow_brute_by_ip = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_fail_ip_per_day',
  points: max_wrong_attempts_by_ip_par_day,
  duration: 60 * 60 * 24,
  blockDuration: 60 * 60 * 24,
});

export const limiter_consecutive_fails_by_email_and_ip = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_fail_consecutive_email_and_ip',
  points: max_consecutive_fails_by_email_and_ip,
  duration: 60 * 60 * 24 * 90,
  blockDuration: 60 * 60 * 24 * 2,
});
