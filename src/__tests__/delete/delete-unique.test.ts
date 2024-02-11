import { Blog, PrismaClient, User } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import { resetDb, seededUsers, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('delete unique', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    realUser = (await prisma.user.findUnique({ where: { email: seededUsers[0].email } }))!;
    mockUser = (await prismock.user.findUnique({ where: { email: seededUsers[0].email } }))!;

    const imprint = createId();

    await prisma.blog.create({
      data: {
        title: 'blog-9',
        imprint,
        priority: 1,
        category: 'test',
        userId: realUser.id,
      },
    });
    await prismock.blog.create({
      data: {
        title: 'blog-9',
        imprint,
        priority: 1,
        category: 'test',
        userId: mockUser.id,
      },
    });
  });

  describe('delete', () => {
    let realDelete: Blog;
    let mockDelete: Blog;

    beforeAll(async () => {
      realDelete = await prisma.blog.delete({
        where: { blogByUserAndCategory: { userId: realUser.id, category: 'test' } },
      });
      mockDelete = await prismock.blog.delete({
        where: { blogByUserAndCategory: { userId: mockUser.id, category: 'test' } },
      });
    });

    it('Should delete a single element', () => {
      expect(realDelete.title).toEqual('blog-9');
      expect(mockDelete.title).toEqual('blog-9');
    });

    it('Should delete user from stored data', async () => {
      const stored = await prisma.blog.findMany();
      const mockStored = prismock.getData().blog;

      expect(stored.find((blog) => blog.title === 'blog-9')).toBeUndefined();
      expect(mockStored.find((blog) => blog.title === 'blog-9')).toBeUndefined();
    });

    it('Should throw if no element is found', async () => {
      await expect(() =>
        prisma.blog.delete({ where: { blogByUserAndCategory: { userId: realUser.id, category: 'does-not-exist' } } }),
      ).rejects.toThrow();
      await expect(() =>
        prismock.blog.delete({
          where: { blogByUserAndCategory: { userId: mockUser.id, category: 'does-not-exist' } },
        }),
      ).rejects.toThrow();
    });
  });
});
