import { PrismaClient } from '@prisma/client';
import { resetDb, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

describe('deleteMany', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  const users = {
    user1: { email: 'user-delete-1@company.com', password: 'password', warnings: 0 },
    user2: { email: 'user-delete-2@company.com', password: 'password', warnings: 99 },
    user3: { email: 'user-delete-3@company.com', password: 'password', warnings: 99 },
  };

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const user1 = await prisma.user.create({ data: users.user1 });
    const user2 = await prisma.user.create({ data: users.user2 });
    const user3 = await prisma.user.create({ data: users.user3 });

    await prismock.user.createMany({ data: [user1, user2, user3].map(({ id, ...user }) => ({ ...user, parameters: {} })) });
  });

  describe('On deleteMany', () => {
    it('Should return count', async () => {
      expect(await prisma.post.deleteMany({})).toEqual({ count: 2 });
      expect(await prismock.post.deleteMany({})).toEqual({ count: 2 });
    });

    it('Should remove items', async () => {
      expect(await prisma.post.findMany()).toEqual([]);
      expect(await prismock.post.findMany()).toEqual([]);
    });
  });

  describe('On deleteMany with null children', () => {
    it('Should return count', async () => {
      expect(await prisma.blog.deleteMany({ where: { author: { is: null } } })).toEqual({ count: 1 });
      expect(await prismock.blog.deleteMany({ where: { author: { is: null } } })).toEqual({ count: 1 });
    });

    it('Should remove items', async () => {
      expect(await prisma.blog.findMany({ select: { title: true } })).toEqual([
        {
          title: 'blog-2',
        },
      ]);
      expect(await prismock.blog.findMany({ select: { title: true } })).toEqual([
        {
          title: 'blog-2',
        },
      ]);
    });
  });

  it('Should return count 0 for no match', async () => {
    expect(await prisma.user.deleteMany({ where: { email: 'does-not-exist' } })).toEqual({ count: 0 });
    expect(await prismock.user.deleteMany({ where: { email: 'does-not-exist' } })).toEqual({ count: 0 });
  });
});
