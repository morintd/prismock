import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('find', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    simulateSeed(prismock);

    const users = [
      {
        email: 'user4@company.com',
        warnings: 5,
        password: 'password3',
      },
      {
        email: 'user7@company.com',
        warnings: null,
        password: 'password8',
      },
      {
        email: 'user6@company.com',
        warnings: 4,
        password: 'password2',
      },
      {
        email: 'user5@company.com',
        warnings: null,
        password: 'password5',
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
  });

  it('Should return ordered items based on numbers', async () => {
    const mockUsers = await prismock.user.findMany({
      orderBy: { warnings: 'asc' },
      select: { warnings: true, email: true },
    });

    const realUsers = await prisma.user.findMany({
      orderBy: { warnings: 'asc' },
      select: { warnings: true, email: true },
    });

    expect(mockUsers).toEqual(realUsers);
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
    const mockUsers = await prismock.user.findMany({
      orderBy: [{ warnings: 'desc' }, { email: 'desc' }],
      select: { warnings: true, email: true },
    });

    const realUsers = await prisma.user.findMany({
      orderBy: [{ warnings: 'desc' }, { email: 'desc' }],
      select: { warnings: true, email: true },
    });

    expect(mockUsers).toEqual(realUsers);
  });

  it('Should return ordered items with three orderBy', async () => {
    const mockUsers = await prismock.user.findMany({
      orderBy: [{ email: 'desc' }, { warnings: { sort: 'desc', nulls: 'first' } }, { password: 'asc' }],
      select: { warnings: true, email: true },
    });

    const realUsers = await prisma.user.findMany({
      orderBy: [{ email: 'desc' }, { warnings: { sort: 'desc', nulls: 'first' } }, { password: 'asc' }],
      select: { warnings: true, email: true },
    });

    expect(mockUsers).toEqual(realUsers);
  });

  it('Should return orderer items with null first', async () => {
    const mockUsers = await prismock.user.findMany({
      orderBy: [{ warnings: { sort: 'asc', nulls: 'first' } }, { email: 'desc' }],
      select: { warnings: true, email: true },
    });

    const realUsers = await prisma.user.findMany({
      orderBy: [{ warnings: { sort: 'asc', nulls: 'first' } }, { email: 'desc' }],
      select: { warnings: true, email: true },
    });

    expect(mockUsers).toEqual(realUsers);
  });

  it('Should return orderer items with null last', async () => {
    const mockUsers = await prismock.user.findMany({
      orderBy: [{ warnings: { sort: 'asc', nulls: 'last' } }, { email: 'desc' }],
      select: { warnings: true, email: true },
    });

    const realUsers = await prisma.user.findMany({
      orderBy: [{ warnings: { sort: 'asc', nulls: 'last' } }, { email: 'desc' }],
      select: { warnings: true, email: true },
    });

    expect(mockUsers).toEqual(realUsers);
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
