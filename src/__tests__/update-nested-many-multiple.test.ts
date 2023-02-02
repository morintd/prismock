import { Blog, PrismaClient, User } from '@prisma/client';

import {
  resetDb,
  simulateSeed,
  buildUser,
  buildPost,
  formatEntries,
  formatEntry,
  seededUsers,
  seededPosts,
  seededBlogs,
} from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

describe('updateMany (nested/multiple)', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  let realUsers: User[];
  let mockUsers: User[];

  let realAuthor: User;
  let mockAuthor: User;

  let realBlog: Blog;
  let mockBlog: Blog;

  const date = new Date();

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);
  });

  beforeAll(async () => {
    realAuthor = (await prisma.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    mockAuthor = (await prismock.user.findUnique({ where: { email: 'user1@company.com' } }))!;

    realBlog = (await prisma.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
    mockBlog = (await prismock.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;

    realUsers = await prisma.user.findMany({});
    mockUsers = await prismock.user.findMany({});

    await prisma.post.update({ where: { title: seededPosts[1].title }, data: { authorId: realUsers[0].id } });
    await prismock.post.update({ where: { title: seededPosts[1].title }, data: { authorId: mockUsers[0].id } });

    realUser = await prisma.user.update({
      where: { email: seededUsers[0].email },
      data: {
        friends: 1,
        posts: {
          updateMany: [{ where: {}, data: { createdAt: date } }],
        },
      },
    });

    mockUser = await prismock.user.update({
      where: { email: seededUsers[0].email },
      data: {
        friends: 1,
        posts: {
          updateMany: [{ where: {}, data: { createdAt: date } }],
        },
      },
    });
  });

  it('Should return updated', () => {
    const expected = buildUser(1, { friends: 1 });
    expect(formatEntry(realUser)).toEqual(formatEntry(expected));
    expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
  });

  it('Should store updated', async () => {
    const expected = [
      buildPost(1, { createdAt: date, authorId: seededUsers[0].id, blogId: seededBlogs[0].id }),
      buildPost(2, { createdAt: date, authorId: seededUsers[0].id, blogId: seededBlogs[1].id }),
    ].map(({ imprint, ...post }) => post);

    const stored = (await prisma.post.findMany())
      .sort((a, b) => a.id.toString().localeCompare(b.id.toString()))
      .map(({ imprint, ...post }) => post);
    const mockStored = prismock.getData().post.map(({ imprint, ...post }) => post);

    expect(formatEntries(stored)).toEqual(
      formatEntries(expected.map((e) => ({ ...e, authorId: realAuthor.id, blogId: realBlog.id }))),
    );
    expect(formatEntries(mockStored)).toEqual(
      formatEntries(expected.map((e) => ({ ...e, authorId: mockAuthor.id, blogId: mockBlog.id }))),
    );
  });
});
