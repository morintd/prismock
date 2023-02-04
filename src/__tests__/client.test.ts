/* eslint-disable jest/no-conditional-expect */
import { Prisma, PrismaClient } from '@prisma/client';
import { DMMF } from '@prisma/generator-helper';

import { resetDb, seededBlogs, seededPosts, seededUsers, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generateDMMF, generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

function isSQL(schema: DMMF.Document) {
  return schema.mappings.otherOperations.write.includes('queryRaw');
}

describe('client', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let schema: DMMF.Document;

  async function reset() {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);

    schema = await generateDMMF();
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

  it('Should handle $use', () => {});

  /* SQL only */
  it('Should handle executeRaw', async () => {
    if (isSQL(schema)) {
      await expect(
        prisma.$executeRaw(Prisma.sql`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
      await expect(
        prismock.$executeRaw(Prisma.sql`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
    }
  });

  it('Should handle executeRawUnsafe', async () => {
    if (isSQL(schema)) {
      await expect(
        prisma.$executeRawUnsafe(`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
      await expect(
        prismock.$executeRawUnsafe(`DELETE FROM public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toBe(0);
    }
  });

  it('Should handle $queryRaw', async () => {
    if (isSQL(schema)) {
      await expect(
        prisma.$queryRaw(Prisma.sql`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
      await expect(
        prismock.$queryRaw(Prisma.sql`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
    }
  });

  it('Should handle $queryRawUnsafe', async () => {
    if (isSQL(schema)) {
      await expect(
        prisma.$queryRawUnsafe(`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
      await expect(
        prismock.$queryRawUnsafe(`SELECT * from public."User" where email = 'does-not-exist@gmail.com'`),
      ).resolves.toEqual([]);
    }
  });

  it('Should handle $transaction', async () => {
    if (isSQL(schema)) {
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
