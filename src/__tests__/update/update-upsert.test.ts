import { PrismaClient } from '@prisma/client';

import { resetDb, seededBlogs, seededPosts, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('create (connectOrCreate)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;

    await simulateSeed(prismock);
  });

  describe('On update post with existing user', () => {
    let realResponse: { title: string };
    let mockResponse: { title: string };

    beforeAll(async () => {
      realResponse = await prisma.post.update({
        where: {
          title: seededPosts[0].title,
        },
        data: {
          title: 'update-post-with-existing-user',
          author: {
            upsert: {
              create: {
                email: 'existing-user-post-upsert@company.com',
                password: 'userpassword',
              },
              update: {
                email: 'existing-user-post-upsert@company.com',
                password: 'updatepassword',
              },
            },
          },
        },
        select: {
          title: true,
        },
      });

      mockResponse = await prismock.post.update({
        where: {
          title: seededPosts[0].title,
        },
        data: {
          title: 'update-post-with-existing-user',
          author: {
            upsert: {
              create: {
                email: 'existing-user-post-upsert@company.com',
                password: 'userpassword',
              },
              update: {
                email: 'existing-user-post-upsert@company.com',
                password: 'updatepassword',
              },
            },
          },
        },
        select: {
          title: true,
        },
      });
    });

    it('Should return updated post', () => {
      expect(realResponse).toEqual(mockResponse);
    });

    it('Should update user', async () => {
      const realUser = await prisma.user.findFirst({
        where: {
          email: 'existing-user-post-upsert@company.com',
        },
        select: {
          email: true,
          password: true,
        },
      });

      const mockUser = await prismock.user.findFirst({
        where: {
          email: 'existing-user-post-upsert@company.com',
        },
        select: {
          email: true,
          password: true,
        },
      });

      const expected = {
        email: 'existing-user-post-upsert@company.com',
        password: 'updatepassword',
      };

      expect(realUser).toEqual(expected);
      expect(mockUser).toEqual(expected);
    });

    it('Should update post linked to user', async () => {
      const realPost = await prisma.post.findFirst({
        where: {
          title: 'update-post-with-existing-user',
        },
        select: {
          title: true,
          authorId: true,
        },
      });

      const mockPost = await prismock.post.findFirst({
        where: {
          title: 'update-post-with-existing-user',
        },
        select: {
          title: true,
          authorId: true,
        },
      });

      const realNewUser = (await prisma.user.findFirst({ where: { email: 'existing-user-post-upsert@company.com' } }))!;
      const mockNewUser = (await prismock.user.findFirst({ where: { email: 'existing-user-post-upsert@company.com' } }))!;

      expect(realPost).toEqual({
        title: 'update-post-with-existing-user',
        authorId: realNewUser.id,
      });

      expect(mockPost).toEqual({
        title: 'update-post-with-existing-user',
        authorId: mockNewUser.id,
      });
    });
  });

  describe('On update blog with missing author', () => {
    let realResponse: { title: string };
    let mockResponse: { title: string };

    beforeAll(async () => {
      realResponse = await prisma.blog.update({
        where: {
          title: seededBlogs[0].title,
        },
        data: {
          title: 'update-blog-with-new-user',
          author: {
            upsert: {
              create: {
                email: 'new-user-blog-upsert@company.com',
                password: 'userpassword',
              },
              update: {
                email: 'new-user-blog-upsert@company.com',
                password: 'updatepassword',
              },
            },
          },
        },
        select: {
          title: true,
        },
      });

      mockResponse = await prismock.blog.update({
        where: {
          title: seededBlogs[0].title,
        },
        data: {
          title: 'update-blog-with-new-user',
          author: {
            upsert: {
              create: {
                email: 'new-user-blog-upsert@company.com',
                password: 'userpassword',
              },
              update: {
                email: 'new-user-blog-upsert@company.com',
                password: 'updatepassword',
              },
            },
          },
        },
        select: {
          title: true,
        },
      });
    });

    it('Should return updated blog', () => {
      expect(realResponse).toEqual(mockResponse);
    });

    it('Should create user', async () => {
      const realUser = await prisma.user.findFirst({
        where: {
          email: 'new-user-blog-upsert@company.com',
        },
        select: {
          email: true,
          password: true,
        },
      });

      const mockUser = await prismock.user.findFirst({
        where: {
          email: 'new-user-blog-upsert@company.com',
        },
        select: {
          email: true,
          password: true,
        },
      });

      const expected = {
        email: 'new-user-blog-upsert@company.com',
        password: 'userpassword',
      };

      expect(realUser).toEqual(expected);
      expect(mockUser).toEqual(expected);
    });

    it('Should update blog linked to user', async () => {
      const realBlog = await prisma.blog.findFirst({
        where: {
          title: 'update-blog-with-new-user',
        },
        select: {
          title: true,
          userId: true,
        },
      });

      const mockBlog = await prismock.blog.findFirst({
        where: {
          title: 'update-blog-with-new-user',
        },
        select: {
          title: true,
          userId: true,
        },
      });

      const realNewUser = (await prisma.user.findFirst({ where: { email: 'new-user-blog-upsert@company.com' } }))!;
      const mockNewUser = (await prismock.user.findFirst({ where: { email: 'new-user-blog-upsert@company.com' } }))!;

      expect(realBlog).toEqual({
        title: 'update-blog-with-new-user',
        userId: realNewUser.id,
      });

      expect(mockBlog).toEqual({
        title: 'update-blog-with-new-user',
        userId: mockNewUser.id,
      });
    });
  });
});
