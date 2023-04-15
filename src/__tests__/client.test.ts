/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable jest/no-conditional-expect */
// @ts-nocheck
import { Prisma, PrismaClient } from '@prisma/client';

import { resetDb, seededBlogs, seededPosts, seededUsers, simulateSeed } from '../../testing';
import { PrismockClient, PrismockClientType } from '../lib/client';
import { fetchGenerator, getProvider } from '../lib/prismock';

jest.setTimeout(40000);

describe('client', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let provider: string;

  async function reset() {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    simulateSeed(prismock);

    const generator = await fetchGenerator();
    provider = getProvider(generator);
    generator.stop();
  }

  beforeAll(async () => {
    await reset();
  });

  it('Should handle $connect', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow();
    await expect(prismock.$connect()).resolves.not.toThrow();
  });

  it('Should handle $disconnect', async () => {
    await expect(prisma.$disconnect()).resolves.not.toThrow();
    await expect(prismock.$disconnect()).resolves.not.toThrow();
  });

  it('Should handle $on', () => {
    expect(() => prisma.$on('beforeExit', jest.fn())).not.toThrow();
    expect(() => prismock.$on('beforeExit', jest.fn())).not.toThrow();
  });

  it('Should handle $use', () => {
    expect(() =>
      prisma.$use(async (params, next) => {
        const result = await next(params);
        return result;
      }),
    ).not.toThrow();

    expect(() =>
      prismock.$use(async (params, next) => {
        const result = await next(params);
        return result;
      }),
    ).not.toThrow();
  });

  /* SQL only */
  it('Should handle executeRaw', async () => {
    if (provider === 'postgresql') {
      await expect(
        prisma.$executeRaw(Prisma.sql`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
      await expect(
        prismock.$executeRaw(Prisma.sql`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
    }
  });

  it('Should handle executeRawUnsafe', async () => {
    if (provider === 'postgresql') {
      await expect(
        prisma.$executeRawUnsafe(`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
      await expect(
        prismock.$executeRawUnsafe(`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
    }
  });

  it('Should handle $queryRaw', async () => {
    if (provider === 'postgresql') {
      await expect(
        prisma.$queryRaw(Prisma.sql`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
      await expect(
        prismock.$queryRaw(Prisma.sql`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
    }
  });

  it('Should handle $queryRawUnsafe', async () => {
    if (provider === 'postgresql') {
      await expect(
        prisma.$queryRawUnsafe(`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
      await expect(
        prismock.$queryRawUnsafe(`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
    }
  });

  it('Should handle $transaction', async () => {
    if (provider === 'postgresql') {
      await reset();

      await expect(prisma.$transaction([prisma.post.deleteMany()])).resolves.toEqual([{ count: seededPosts.length }]);
      await expect(prismock.$transaction([prismock.post.deleteMany()])).resolves.toEqual([{ count: seededPosts.length }]);

      await expect(
        prisma.$transaction((tx) =>
          tx.post.create({
            data: {
              title: 'title-transaction',
              authorId: seededUsers[0].id,
              blogId: seededBlogs[0].id,
            },
            select: {
              id: true,
              title: true,
              authorId: true,
              blogId: true,
            },
          }),
        ),
      ).resolves.toEqual({
        id: seededPosts.length + 1,
        title: 'title-transaction',
        authorId: seededUsers[0].id,
        blogId: seededBlogs[0].id,
      });

      await expect(
        prismock.$transaction((tx) =>
          tx.post.create({
            data: {
              title: 'title-transaction',
              authorId: seededUsers[0].id,
              blogId: seededBlogs[0].id,
            },
            select: {
              id: true,
              title: true,
              authorId: true,
              blogId: true,
            },
          }),
        ),
      ).resolves.toEqual({
        id: seededPosts.length + 1,
        title: 'title-transaction',
        authorId: seededUsers[0].id,
        blogId: seededBlogs[0].id,
      });
    }
  });

  /* MongoDB only */
  // it('Should handle $runCommandRaw', () => {});
  // it('Should handle findRaw', () => {});
  // it('Should handle aggregateRaw', () => {});
});
