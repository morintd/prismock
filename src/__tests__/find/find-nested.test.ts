import { PrismaClient } from '@prisma/client';

import { resetDb, seededBlogs, seededUsers, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('find', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
  });

  it('Should return elements with nested find', async () => {
    const expected = [{ title: seededBlogs[0].title }];

    const realArticles = await prisma.blog.findMany({
      where: {
        posts: {
          some: {
            author: {
              email: seededUsers[0].email,
            },
          },
        },
      },
      select: {
        title: true,
      },
    });

    const mockArticles = await prismock.blog.findMany({
      where: {
        posts: {
          some: {
            author: {
              email: seededUsers[0].email,
            },
          },
        },
      },
      select: {
        title: true,
      },
    });

    expect(realArticles).toEqual(expected);
    expect(mockArticles).toEqual(expected);
  });
});
