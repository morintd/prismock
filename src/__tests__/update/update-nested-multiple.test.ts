import { Blog, PrismaClient, User } from '@prisma/client';

import {
  resetDb,
  simulateSeed,
  buildUser,
  buildPost,
  formatEntry,
  seededPosts,
  seededUsers,
  seededBlogs,
} from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('update (nested)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  let realAuthor: User;
  let mockAuthor: User;

  let realBlog: Blog;
  let mockBlog: Blog;

  const date = new Date();

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
  });

  beforeAll(async () => {
    realAuthor = (await prisma.user.findUnique({ where: { email: 'user1@company.com' } }))!;
    mockAuthor = (await prismock.user.findUnique({ where: { email: 'user1@company.com' } }))!;

    realBlog = (await prisma.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;
    mockBlog = (await prismock.blog.findUnique({ where: { title: seededBlogs[0].title } }))!;

    await prisma.post.update({
      where: { title: seededPosts[1].title },
      data: { authorId: realAuthor.id, blogId: realBlog.id },
    });
    await prismock.post.update({
      where: { title: seededPosts[1].title },
      data: { authorId: mockAuthor.id, blogId: mockBlog.id },
    });

    realUser = await prisma.user.update({
      where: { email: seededUsers[0].email },
      data: {
        friends: 1,
        posts: {
          update: [
            {
              where: {
                title: 'title1',
              },
              data: {
                createdAt: date,
              },
            },
          ],
        },
      },
    });

    mockUser = await prismock.user.update({
      where: { email: seededUsers[0].email },
      data: {
        friends: 1,
        posts: {
          update: [
            {
              where: {
                title: 'title1',
              },
              data: {
                createdAt: date,
              },
            },
          ],
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
      buildPost(2, { authorId: seededUsers[0].id, blogId: seededBlogs[1].id }),
    ].map(({ imprint, ...post }) => post);

    const stored = (await prisma.post.findMany())
      .sort((a, b) => a.id.toString().localeCompare(b.id.toString()))
      .map(({ imprint, ...post }) => post);

    const mockStored = prismock.getData().post.map(({ imprint, ...post }) => post);

    expect(formatEntry(stored[0])).toEqual(formatEntry({ ...expected[0], authorId: realAuthor.id, blogId: realBlog.id }));
    expect(formatEntry(mockStored[0])).toEqual(
      formatEntry({ ...expected[0], authorId: mockAuthor.id, blogId: mockBlog.id }),
    );

    const { createdAt, ...post } = expected[1];
    const { createdAt: realCreatedAt, ...realPost } = stored[1];
    const { createdAt: mockCreatedAt, ...mockPost } = mockStored[1];

    expect(formatEntry(realPost)).toEqual(formatEntry({ ...post, authorId: realAuthor.id, blogId: realBlog.id }));
    expect(formatEntry(mockPost)).toEqual(formatEntry({ ...post, authorId: mockAuthor.id, blogId: mockBlog.id }));
    expect(realCreatedAt).not.toEqual(createdAt);
    expect(mockCreatedAt).not.toEqual(createdAt);
  });
});
