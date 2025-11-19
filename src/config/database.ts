import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

export const prisma = new PrismaClient();

export const redisClient = new Redis({
  host: process.env.REDIS_HOST as string,
  port: Number(process.env.REDIS_PORT),
  enableOfflineQueue: false,
});
