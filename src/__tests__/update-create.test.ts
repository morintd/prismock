import { Blog, PrismaClient, User } from '@prisma/client';

import {
  resetDb,
  simulateSeed,
  buildUser,
  buildPost,
  formatEntry,
  formatEntries,
  seededUsers,
  seededBlogs,
} from '../../testing';
import { PrismockClient, PrismockClientType } from '../lib/client';

jest.setTimeout(40000);

describe('update (create)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  let realAuthor1: User;
  let realAuthor2: User;

  let mockAuthor1: User;
  let mockAuthor2: User;

  let realBlog1: Blog;
  let realBlog2: Blog;

  let mockBlog1: Blog;
  let mockBlog2: Blog;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    simulateSeed(prismock);
  });

  beforeAll(async () => {
    realAuthor1 = (await prisma.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    realAuthor2 = (await prisma.user.findUnique({ where: { email: 'user2@company.com' } }))!;

    mockAuthor1 = (await prismock.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    mockAuthor2 = (await prismock.user.findUnique({ where: { email: 'user2@company.com' } }))!;

    realBlog1 = (await prisma.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
    realBlog2 = (await prisma.blog.findUnique({ where: { title: seededBlogs[1].title } }))!;

    mockBlog1 = (await prismock.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
    mockBlog2 = (await prismock.blog.findUnique({ where: { title: seededBlogs[1].title } }))!;

    realUser = await prisma.user.update({
      where: { email: seededUsers[0].email },
      data: {
        friends: 1,
        posts: {
          create: {
            title: 'nested',
            blog: {
              connect: {
                title: seededBlogs[0].title,
              },
            },
          },
        },
      },
    });

    mockUser = await prismock.user.update({
      where: { email: seededUsers[0].email },
      data: {
        friends: 1,
        posts: {
          create: {
            title: 'nested',
            blog: {
              connect: {
                title: seededBlogs[0].title,
              },
            },
          },
        },
      },
    });
  });

  it('Should return created', () => {
    const expected = buildUser(1, { friends: 1 });
    expect(formatEntry(realUser)).toEqual(formatEntry(expected));
    expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
  });

  it('Should store created', async () => {
    const expected = [
      buildPost(1, { authorId: seededUsers[0].id, blogId: seededBlogs[0].id }),
      buildPost(2, { authorId: seededUsers[1].id, blogId: seededBlogs[1].id }),
      buildPost(3, { authorId: seededUsers[0].id, title: 'nested', blogId: seededBlogs[0].id }),
    ].map((post) => ({ ...post, createdAt: expect.any(Date), imprint: expect.any(String) }));

    const stored = await prisma.post.findMany();
    const mockStored = prismock.getData().post;

    expect(formatEntries(stored)).toEqual(
      formatEntries([
        { ...expected[0], authorId: realAuthor1.id, blogId: realBlog1.id },
        { ...expected[1], authorId: realAuthor2.id, blogId: realBlog2.id },
        { ...expected[2], authorId: realAuthor1.id, blogId: realBlog1.id },
      ]),
    );
    expect(formatEntries(mockStored)).toEqual(
      formatEntries([
        { ...expected[0], authorId: mockAuthor1.id, blogId: mockBlog1.id },
        { ...expected[1], authorId: mockAuthor2.id, blogId: mockBlog2.id },
        { ...expected[2], authorId: mockAuthor1.id, blogId: mockBlog1.id },
      ]),
    );
  });
});
