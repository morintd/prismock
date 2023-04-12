import { Blog, Post, PrismaClient } from '@prisma/client';

import { formatEntry, resetDb, seededBlogs, seededPosts, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

describe('delete (includes)', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realDelete: Blog & { posts: Post[] };
  let mockDelete: Blog & { posts: Post[] };

  let realBlog1: Blog;
  let mockBlog1: Blog;

  let realBlog2: Blog;
  let mockBlog2: Blog;

  let realPost1: Post;
  let mockPost1: Post;

  let realPost2: Post;
  let mockPost2: Post;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);

    realBlog1 = (await prisma.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
    mockBlog1 = (await prismock.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;

    realBlog2 = (await prisma.blog.findUnique({ where: { title: seededBlogs[1].title } }))!;
    mockBlog2 = (await prismock.blog.findUnique({ where: { title: seededBlogs[1].title } }))!;

    realPost1 = (await prisma.post.findUnique({ where: { title: seededPosts[0].title } }))!;
    mockPost1 = (await prismock.post.findUnique({ where: { title: seededPosts[0].title } }))!;

    realPost2 = (await prisma.post.findUnique({ where: { title: seededPosts[1].title } }))!;
    mockPost2 = (await prismock.post.findUnique({ where: { title: seededPosts[1].title } }))!;

    realDelete = await prisma.blog.delete({ where: { title: 'blog-1' }, include: { posts: true } });
    mockDelete = await prismock.blog.delete({ where: { title: 'blog-1' }, include: { posts: true } });
  });

  it('Should delete a single element', () => {
    expect(realDelete).toEqual({
      ...seededBlogs[0],
      id: realBlog1.id,
      posts: [
        {
          ...seededPosts[0],
          id: realPost1.id,
          authorId: realPost1.authorId,
          createdAt: expect.any(Date),
          imprint: expect.any(String),
        },
      ],
    });
    expect(mockDelete).toEqual({
      ...seededBlogs[0],
      id: mockBlog1.id,
      posts: [
        {
          ...seededPosts[0],
          id: mockPost1.id,
          authorId: mockPost1.authorId,
          createdAt: expect.any(Date),
          imprint: expect.any(String),
        },
      ],
    });
  });

  it('Should delete blog from stored data', async () => {
    const stored = await prisma.blog.findMany();
    const mockStored = prismock.getData().blog;

    expect(stored).toEqual([realBlog2]);
    expect(mockStored).toEqual([mockBlog2]);
  });

  it('Should delete posts from stored data', async () => {
    const stored = await prisma.post.findMany();
    const mockStored = await prismock.post.findMany();

    expect(stored).toEqual([{ ...realPost2, createdAt: expect.any(Date), imprint: expect.any(String) }]);
    expect(mockStored).toEqual([{ ...mockPost2, createdAt: expect.any(Date), imprint: expect.any(String) }]);
  });
});
