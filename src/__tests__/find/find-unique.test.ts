import { PrismaClient, User } from '@prisma/client';

import { resetDb, seededUsers, simulateSeed, seededBlogs } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';
import { fetchGenerator } from '../../lib/prismock';

jest.setTimeout(40000);

describe('find', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const generator = await fetchGenerator();
    generator.stop();

    realUser = (await prisma.user.findUnique({ where: { email: seededUsers[0].email } }))!;
    mockUser = (await prismock.user.findUnique({ where: { email: seededUsers[0].email } }))!;
  });

  describe('findUnique', () => {
    it('Should return corresponding item', async () => {
      const expected = seededBlogs[1].title;
      const realBlog = (await prisma.blog.findUnique({
        where: { blogByUserAndCategory: { userId: realUser.id, category: 'normal' } },
      }))!;
      const mockBlog = (await prismock.blog.findUnique({
        where: { blogByUserAndCategory: { userId: mockUser.id, category: 'normal' } },
      }))!;

      expect(realBlog.title).toEqual(expected);
      expect(mockBlog.title).toEqual(expected);
    });
  });
});
