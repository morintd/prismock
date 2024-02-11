import { Blog, PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import { resetDb, seededUsers, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('delete unique', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  const data = {
    blog1: { title: 'blog-9', imprint: createId(), priority: 1, category: 'test', userId: seededUsers[0].id },
  };

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const user1 = await prisma.blog.create({ data: data.blog1 });

    await prismock.blog.createMany({ data: [user1].map(({ id, ...blog }) => ({ ...blog, parameters: {} })) });
  });

  describe('delete', () => {
    let realDelete: Blog;
    let mockDelete: Blog;

    beforeAll(async () => {
      realDelete = await prisma.blog.delete({
        where: { blogByUserAndCategory: { userId: seededUsers[0].id, category: 'test' } },
      });
      mockDelete = await prismock.blog.delete({
        where: { blogByUserAndCategory: { userId: seededUsers[0].id, category: 'test' } },
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
        prisma.blog.delete({ where: { blogByUserAndCategory: { userId: seededUsers[0].id, category: 'does-not-exist' } } }),
      ).rejects.toThrow();
      await expect(() =>
        prismock.blog.delete({
          where: { blogByUserAndCategory: { userId: seededUsers[0].id, category: 'does-not-exist' } },
        }),
      ).rejects.toThrow();
    });
  });
});
