/* eslint-disable no-console */
/* eslint-disable jest/no-conditional-expect */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';
import { fetchGenerator, getProvider } from '../../lib/prismock';

jest.setTimeout(40000);
const now = new Date().getTime();

describe('find', () => {
  let provider: string;
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const users = [
      {
        email: 'user5@company.com',
        warnings: null,
        password: 'password5',
        birthday: new Date(now - 1000000000200),
      },
      {
        email: 'user4@company.com',
        warnings: 15,
        password: 'password4',
        birthday: new Date(now - 1000000000000),
      },
      {
        email: 'user6@company.com',
        warnings: 15,
        password: 'password3',
        birthday: new Date(now - 1000000000100),
      },
    ];

    await prismock.user.createMany({
      data: users,
    });

    await prisma.user.createMany({
      data: users,
    });

    const mockBlog = (await prismock.blog.findFirst())!;
    const realBlog = (await prisma.blog.findFirst())!;

    const mockUser2 = (await prismock.user.findFirst({ where: { email: 'user2@company.com' } }))!;
    const realUser2 = (await prisma.user.findFirst({ where: { email: 'user2@company.com' } }))!;

    const mockUser4 = (await prismock.user.findFirst({ where: { email: 'user4@company.com' } }))!;
    const realUser4 = (await prisma.user.findFirst({ where: { email: 'user4@company.com' } }))!;

    const mockUser5 = (await prismock.user.findFirst({ where: { email: 'user5@company.com' } }))!;
    const realUser5 = (await prisma.user.findFirst({ where: { email: 'user5@company.com' } }))!;

    const titlesUser4 = ['order-by-user4', 'order-by-user-4-2', 'order-by-user-4-3', 'order-by-user-4-4'];
    const titlesUser5 = ['order-by-user5', 'order-by-user-5-2', 'order-by-user-5-3'];

    await Promise.all([
      ...titlesUser4.map((title) =>
        prismock.post.create({
          data: {
            title,
            authorId: mockUser4.id,
            blogId: mockBlog.id,
          },
        }),
      ),
      ...titlesUser4.map((title) =>
        prisma.post.create({
          data: {
            title,
            authorId: realUser4.id,
            blogId: realBlog.id,
          },
        }),
      ),
    ]);

    await Promise.all([
      ...titlesUser5.map((title) =>
        prismock.post.create({
          data: {
            title,
            authorId: mockUser5.id,
            blogId: mockBlog.id,
          },
        }),
      ),
      ...titlesUser5.map((title) =>
        prisma.post.create({
          data: {
            title,
            authorId: realUser5.id,
            blogId: realBlog.id,
          },
        }),
      ),
    ]);

    await prismock.post.create({
      data: {
        title: 'order-by-user-2',
        authorId: mockUser2.id,
        blogId: mockBlog.id,
      },
    });

    await prisma.post.create({
      data: {
        title: 'order-by-user-2',
        authorId: realUser2.id,
        blogId: realBlog.id,
      },
    });

    const generator = await fetchGenerator();
    provider = getProvider(generator)!;
    generator.stop();
  });

  it('Should return ordered users based on date', async () => {
    if (!['mongodb'].includes(provider)) {
      const mockUsers = await prismock.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: { birthday: { sort: 'desc', nulls: 'last' } },
        take: 3,
      });

      const realUsers = await prisma.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: { birthday: { sort: 'desc', nulls: 'last' } },
        take: 3,
      });

      expect(mockUsers[0].birthday).toEqual(new Date(now - 1000000000000));
      expect(realUsers[0].birthday).toEqual(new Date(now - 1000000000000));
      expect(mockUsers).toEqual(realUsers);
    } else {
      console.log('[SKIPPED] ordering with nulls is not supported on MongoDB');
    }
  });

  it('Should return ordered items based on numbers', async () => {
    if (!['mongodb'].includes(provider)) {
      const mockUsers = await prismock.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: { warnings: { sort: 'asc', nulls: 'last' } },
        select: { warnings: true, email: true },
      });

      const realUsers = await prisma.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: { warnings: { sort: 'asc', nulls: 'last' } },
        select: { warnings: true, email: true },
      });

      expect(mockUsers).toEqual(realUsers);
    } else {
      console.log('[SKIPPED] ordering with nulls is not supported on MongoDB');
    }
  });

  it('Should return ordered items based on string', async () => {
    const mockUsers = await prismock.user.findMany({
      orderBy: { email: 'desc' },
      select: { warnings: true, email: true },
    });

    const realUsers = await prisma.user.findMany({
      orderBy: { email: 'desc' },
      select: { warnings: true, email: true },
    });

    expect(mockUsers).toEqual(realUsers);
  });
  it('Should return ordered items with two orderBy', async () => {
    if (!['mongodb'].includes(provider)) {
      const mockUsers = await prismock.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: [{ warnings: { sort: 'desc', nulls: 'last' } }, { email: 'desc' }],
        select: { warnings: true, email: true },
      });

      const realUsers = await prisma.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: [{ warnings: { sort: 'desc', nulls: 'last' } }, { email: 'desc' }],
        select: { warnings: true, email: true },
      });

      expect(mockUsers).toEqual(realUsers);
    } else {
      console.log('[SKIPPED] ordering with nulls is not supported on MongoDB');
    }
  });

  it('Should return ordered items with three orderBy', async () => {
    if (!['mongodb'].includes(provider)) {
      const mockUsers = await prismock.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: [{ email: 'desc' }, { warnings: { sort: 'desc', nulls: 'first' } }, { password: 'asc' }],
        select: { warnings: true, email: true },
      });

      const realUsers = await prisma.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: [{ email: 'desc' }, { warnings: { sort: 'desc', nulls: 'first' } }, { password: 'asc' }],
        select: { warnings: true, email: true },
      });

      expect(mockUsers).toEqual(realUsers);
    } else {
      console.log('[SKIPPED] ordering with nulls is not supported on MongoDB');
    }
  });

  it('Should return orderer items with null first', async () => {
    if (!['mongodb'].includes(provider)) {
      const mockUsers = await prismock.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: [{ warnings: { sort: 'asc', nulls: 'first' } }, { email: 'desc' }],
        select: { warnings: true, email: true },
      });

      const realUsers = await prisma.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: [{ warnings: { sort: 'asc', nulls: 'first' } }, { email: 'desc' }],
        select: { warnings: true, email: true },
      });

      expect(mockUsers).toEqual(realUsers);
    } else {
      console.log('[SKIPPED] ordering with nulls is not supported on MongoDB');
    }
  });

  it('Should return orderer items with null last', async () => {
    if (!['mongodb'].includes(provider)) {
      const mockUsers = await prismock.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: [{ warnings: { sort: 'asc', nulls: 'last' } }, { email: 'desc' }],
        select: { warnings: true, email: true },
      });

      const realUsers = await prisma.user.findMany({
        // @ts-ignore @TODO: separate test for mongodb, as it doesn't support nulls:
        orderBy: [{ warnings: { sort: 'asc', nulls: 'last' } }, { email: 'desc' }],
        select: { warnings: true, email: true },
      });

      expect(mockUsers).toEqual(realUsers);
    } else {
      console.log('[SKIPPED] ordering with nulls is not supported on MongoDB');
    }
  });

  it('Should return orderer items with relation', async () => {
    const mockUsers = await prismock.user.findMany({
      orderBy: [{ posts: { _count: 'asc' } }],
      select: { warnings: true, email: true },
    });

    const realUsers = await prisma.user.findMany({
      orderBy: [{ posts: { _count: 'asc' } }],
      select: { warnings: true, email: true },
    });

    expect(mockUsers).toEqual(realUsers);
  });

  it('Should return ordered items with multiple orderBy including count', async () => {
    const mockUsers = await prismock.user.findMany({
      orderBy: [{ posts: { _count: 'desc' } }, { email: 'asc' }],
      select: { warnings: true, email: true },
    });

    const realUsers = await prisma.user.findMany({
      orderBy: [{ posts: { _count: 'desc' } }, { email: 'asc' }],
      select: { warnings: true, email: true },
    });

    expect(mockUsers).toEqual(realUsers);
  });
});
