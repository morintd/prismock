/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable jest/no-conditional-expect */
// @ts-nocheck
import { PrismaClient, User } from '@prisma/client';

import { resetDb, seededUsers, simulateSeed, seededBlogs, seededServices } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';
import { fetchGenerator, getProvider } from '../../lib/prismock';

jest.setTimeout(40000);

describe('find', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  let provider: string;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const generator = await fetchGenerator();
    provider = getProvider(generator)!;
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

    it('Should return corresponding item based on @@id', async () => {
      if (provider !== 'mongodb') {
        const expected = seededServices[0];
        const realService = (await prisma.service.findUnique({
          where: { compositeId: { name: expected.name, userId: expected.userId } },
        }))!;
        const mockService = (await prismock.service.findUnique({
          where: { compositeId: { name: expected.name, userId: expected.userId } },
        }))!;

        expect(realService).toEqual(expected);
        expect(mockService).toEqual(expected);
      }
    });
  });
});
