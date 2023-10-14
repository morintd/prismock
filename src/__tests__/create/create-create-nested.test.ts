import { Blog, PrismaClient, User } from '@prisma/client';

import { buildUser, formatEntry, resetDb, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('create', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let mockBlog: Blog;
  let realBlog: Blog;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    realBlog = (await prisma.blog.findUnique({ where: { title: 'blog-1' } }))!;
    mockBlog = (await prismock.blog.findUnique({ where: { title: 'blog-1' } }))!;
  });

  describe('createMany (nested)', () => {
    let realUser: User;
    let mockUser: User;

    beforeAll(async () => {
      realUser = await prisma.user.create({
        data: {
          email: 'user4@company.com',
          password: 'password',
          warnings: 0,
          posts: {
            createMany: {
              data: [
                {
                  title: 'title-user4',
                  blogId: realBlog.id,
                },
              ],
            },
          },
        },
      });

      mockUser = await prismock.user.create({
        data: {
          email: 'user4@company.com',
          password: 'password',
          warnings: 0,
          posts: {
            createMany: {
              data: [
                {
                  title: 'title-user4',
                  blogId: mockBlog.id,
                },
              ],
            },
          },
        },
      });
    });

    it('Should return created user', () => {
      const expected = buildUser(4, {});

      expect(formatEntry(realUser)).toEqual(formatEntry(expected));
      expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
    });

    it('Should create nested post', async () => {
      const realPost = (await prisma.post.findUnique({
        where: { title: 'title-user4' },
        select: {
          title: true,
          authorId: true,
          blogId: true,
        },
      }))!;

      const mockPost = (await prismock.post.findUnique({
        where: { title: 'title-user4' },
        select: {
          title: true,
          authorId: true,
          blogId: true,
        },
      }))!;

      expect(formatEntry(realPost)).toEqual({
        title: 'title-user4',
        authorId: realUser.id,
        blogId: realBlog.id,
      });
      expect(formatEntry(mockPost)).toEqual({
        title: 'title-user4',
        authorId: mockUser.id,
        blogId: mockBlog.id,
      });
    });
  });

  describe('create (nested)', () => {
    let realUser: User;
    let mockUser: User;

    beforeAll(async () => {
      realUser = await prisma.user.create({
        data: {
          email: 'user5@company.com',
          password: 'password',
          warnings: 0,
          posts: {
            create: [
              {
                title: 'title-user5',
                blogId: realBlog.id,
              },
              {
                title: 'title-user5-2',
                blogId: realBlog.id,
              },
            ],
          },
        },
      });

      mockUser = await prismock.user.create({
        data: {
          email: 'user5@company.com',
          password: 'password',
          warnings: 0,
          posts: {
            create: [
              {
                title: 'title-user5',
                blogId: mockBlog.id,
              },
              {
                title: 'title-user5-2',
                blogId: mockBlog.id,
              },
            ],
          },
        },
      });
    });

    it('Should return created user', () => {
      const expected = buildUser(5, {});

      expect(formatEntry(realUser)).toEqual(formatEntry(expected));
      expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
    });

    it('Should create nested post', async () => {
      const realPost = (await prisma.post.findUnique({
        where: { title: 'title-user5' },
        select: {
          title: true,
          authorId: true,
          blogId: true,
        },
      }))!;
      const realPost2 = (await prisma.post.findUnique({
        where: { title: 'title-user5-2' },
        select: {
          title: true,
          authorId: true,
          blogId: true,
        },
      }))!;

      const mockPost = (await prismock.post.findUnique({
        where: { title: 'title-user5' },
        select: {
          title: true,
          authorId: true,
          blogId: true,
        },
      }))!;

      const mockPost2 = (await prismock.post.findUnique({
        where: { title: 'title-user5-2' },
        select: {
          title: true,
          authorId: true,
          blogId: true,
        },
      }))!;

      expect(formatEntry(realPost)).toEqual({
        title: 'title-user5',
        authorId: realUser.id,
        blogId: realBlog.id,
      });
      expect(formatEntry(realPost2)).toEqual({
        title: 'title-user5-2',
        authorId: realUser.id,
        blogId: realBlog.id,
      });

      expect(formatEntry(mockPost)).toEqual({
        title: 'title-user5',
        authorId: mockUser.id,
        blogId: mockBlog.id,
      });
      expect(formatEntry(mockPost2)).toEqual({
        title: 'title-user5-2',
        authorId: mockUser.id,
        blogId: mockBlog.id,
      });
    });
  });
});
