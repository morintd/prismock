import { PrismaClient } from '@prisma/client';

import { resetDb, seededUsers, simulateSeed, seededBlogs } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';
import { fetchGenerator } from '../../lib/prismock';

jest.setTimeout(40000);

describe('find', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const generator = await fetchGenerator();
    generator.stop();
  });

  describe('findUnique', () => {
    it('Should return corresponding item', async () => {
      const expected = seededBlogs[1].title;
      const realBlog = (await prisma.blog.findUnique({
        where: { blogByUserAndCategory: { userId: seededUsers[0].id, category: 'normal' } },
      }))!;
      const mockBlog = (await prismock.blog.findUnique({
        where: { blogByUserAndCategory: { userId: seededUsers[0].id, category: 'normal' } },
      }))!;

      expect(realBlog.title).toEqual(expected);
      expect(mockBlog.title).toEqual(expected);
    });
  });
});
