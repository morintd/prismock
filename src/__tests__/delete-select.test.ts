import { Blog, Post, PrismaClient } from '@prisma/client';

import { seededBlogs, formatEntry, resetDb, simulateSeed, seededPosts } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

describe('delete (select)', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realDelete: Partial<Blog> & { posts: Partial<Post>[] };
  let mockDelete: Partial<Blog> & { posts: Partial<Post>[] };

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);

    realDelete = await prisma.blog.delete({
      where: { title: 'blog-1' },
      select: { id: true, title: true, posts: { select: { id: true, title: true, authorId: true } } },
    });
    mockDelete = await prismock.blog.delete({
      where: { title: 'blog-1' },
      select: { id: true, title: true, posts: { select: { id: true, title: true, authorId: true } } },
    });
  });

  it('Should delete a single element', () => {
    const expected: Blog & { posts: Partial<Post>[] } = {
      id: 1,
      title: 'blog-1',
      posts: [
        {
          authorId: 1,
          id: 1,
          title: 'title1',
        },
      ],
    };

    expect(formatEntry(realDelete)).toEqual(formatEntry(expected));
    expect(formatEntry(mockDelete)).toEqual(formatEntry(expected));
  });

  it('Should delete blog from stored data', async () => {
    const expected = [seededBlogs[1]];

    const stored = await prisma.blog.findMany();
    const mockStored = prismock.getData().blog;

    expect(stored).toEqual(expected);
    expect(mockStored).toEqual(expected);
  });

  it('Should delete posts from stored data', async () => {
    const { imprint, createdAt, ...expectedPost } = seededPosts[1];
    const expected = [expectedPost];

    const stored = await prisma.post.findMany({ select: { authorId: true, blogId: true, id: true, title: true } });
    const mockStored = await prismock.post.findMany({ select: { authorId: true, blogId: true, id: true, title: true } });

    expect(stored).toEqual(expected);
    expect(mockStored).toEqual(expected);
  });
});
