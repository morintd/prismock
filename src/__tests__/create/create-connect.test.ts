import { PrismaClient, type Post, Tag } from '@prisma/client';

import { resetDb, seededPosts, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType, relationshipStore } from '../../lib/client';

jest.setTimeout(40000);

type PostWithTags = Post & { tags: Tag[] };

describe('create (connect)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeEach(() => relationshipStore.resetValues());

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
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
        category: 'connect',
      },
      select: {
        id: true,
        title: true,
      },
    });

    const realBlog = await prisma.blog.create({
      data: {
        title: 'title-create-connect-multiple',
        posts: {
          connect: [{ title: seededPosts[0].title }],
        },
        category: 'connect',
      },
      select: {
        id: true,
        title: true,
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
        category: 'connect-single',
      },
      select: {
        id: true,
        title: true,
      },
    });

    const realBlog = await prisma.blog.create({
      data: {
        title: 'title-create-connect-single',
        posts: {
          connect: { title: seededPosts[0].title },
        },
        category: 'connect-single',
      },
      select: {
        id: true,
        title: true,
      },
    });

    expect(realBlog).toEqual(expected);
    expect(mockBlog).toEqual(expected);
  });

  it('Should handle many to many relationship', async () => {
    const payload = {
      data: {
        id: 99,
        title: 'Title',
        authorId: 1,
        blogId: 1,
        tags: {
          connect: [{ id: 1 }, { id: 2 }],
        },
      },
    };
    await prisma.post.create(payload);
    await prismock.post.create(payload);

    const realPost = await prisma.post.findFirst({ where: { id: 99 }, include: { tags: true } });
    const mockPost = await prismock.post.findFirst({ where: { id: 99 }, include: { tags: true } });

    expect((mockPost as PostWithTags).tags).toMatchObject((realPost as PostWithTags).tags);
  });
});
