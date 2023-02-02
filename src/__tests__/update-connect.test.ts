import { Blog, PrismaClient, User } from '@prisma/client';

import { resetDb, simulateSeed, seededPosts, seededUsers, formatEntries, formatEntry, seededBlogs } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

describe('update (connect)', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  let realAuthor: User;
  let mockAuthor: User;

  let realBlog: Blog;
  let mockBlog: Blog;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);

    realAuthor = (await prisma.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    mockAuthor = (await prismock.user.findUnique({ where: { email: 'user1@company.com' } }))!;

    realBlog = (await prisma.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
    mockBlog = (await prismock.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;

    realUser = await prisma.user.update({
      where: { email: seededUsers[0].email },
      data: { posts: { connect: { title: seededPosts[1].title } } },
    });

    mockUser = await prismock.user.update({
      where: { email: seededUsers[0].email },
      data: { posts: { connect: { title: seededPosts[1].title } } },
    });
  });

  it('Should return connected', () => {
    const expected = seededUsers[0];
    expect(formatEntry(realUser)).toEqual(formatEntry(expected));
    expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
  });

  it('Should store connected', async () => {
    const stored = await prisma.post.findMany();
    const mockStored = prismock.getData().post;

    expect(formatEntries(stored.map(({ createdAt, imprint, ...post }) => post))).toEqual(
      formatEntries(
        seededPosts.map(({ createdAt, imprint, ...post }) => ({ ...post, authorId: realAuthor.id, blogId: realBlog.id })),
      ),
    );
    expect(formatEntries(mockStored.map(({ createdAt, imprint, ...post }) => post))).toEqual(
      formatEntries(
        seededPosts.map(({ createdAt, imprint, ...post }) => ({ ...post, authorId: mockAuthor.id, blogId: mockBlog.id })),
      ),
    );
  });
});
