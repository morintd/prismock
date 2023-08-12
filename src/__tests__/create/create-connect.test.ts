import { PrismaClient } from '@prisma/client';

import { resetDb, seededPosts, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('create (connect)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    simulateSeed(prismock);
  });

  it('Should create with multiple dependencies and connect to it', async () => {
    const expected = {
      id: expect.anything(),
      title: 'title-create-connect-multiple',
    };

    const mockBlog = await prismock.blog.create({
      data: {
        title: 'title-create-connect-multiple',
        posts: {
          connect: [{ title: seededPosts[0].title }],
        },
      },
    });

    const realBlog = await prisma.blog.create({
      data: {
        title: 'title-create-connect-multiple',
        posts: {
          connect: [{ title: seededPosts[0].title }],
        },
      },
    });

    expect(realBlog).toEqual(expected);
    expect(mockBlog).toEqual(expected);
  });

  it('Should create with dependency and connect to it', async () => {
    const expected = {
      id: expect.anything(),
      title: 'title-create-connect-single',
    };

    const mockBlog = await prismock.blog.create({
      data: {
        title: 'title-create-connect-single',
        posts: {
          connect: { title: seededPosts[0].title },
        },
      },
    });

    const realBlog = await prisma.blog.create({
      data: {
        title: 'title-create-connect-single',
        posts: {
          connect: { title: seededPosts[0].title },
        },
      },
    });

    expect(realBlog).toEqual(expected);
    expect(mockBlog).toEqual(expected);
  });
});
