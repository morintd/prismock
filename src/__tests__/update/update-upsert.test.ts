import { PrismaClient } from '@prisma/client';

import { resetDb, seededPosts, seededUsers, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('create (connectOrCreate)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;

    simulateSeed(prismock);
  });

  describe('On update post with new user', () => {
    beforeAll(async () => {
      await prisma.post.update({
        where: {
          title: seededPosts[0].title,
        },
        data: {
          title: 'update-post-with-new-user',
          author: {
            upsert: {
              create: {
                email: 'new-user-post-upsert@company.com',
                password: 'userpassword',
              },
              update: {
                email: 'new-user-post-upsert@company.com',
                password: 'updatepassword',
              },
            },
          },
        },
      });

      await prismock.post.update({
        where: {
          title: seededPosts[0].title,
        },
        data: {
          title: 'update-post-with-new-user',
          author: {
            upsert: {
              create: {
                email: 'new-user-post-upsert@company.com',
                password: 'userpassword',
              },
              update: {
                email: 'new-user-post-upsert@company.com',
                password: 'updatepassword',
              },
            },
          },
        },
      });
    });

    it('Should create user', async () => {
      const realUser = await prisma.user.findFirst({
        where: {
          email: 'new-user-post-upsert@company.com',
        },
        select: {
          email: true,
          password: true,
        },
      });

      const mockUser = await prismock.user.findFirst({
        where: {
          email: 'new-user-post-upsert@company.com',
        },
        select: {
          email: true,
          password: true,
        },
      });

      expect(realUser).toEqual(mockUser);
    });

    it('Should update post linked to user', async () => {
      const realPost = await prisma.post.findFirst({
        where: {
          title: 'update-post-with-new-user',
        },
        select: {
          title: true,
          authorId: true,
        },
      });

      const mockPost = await prismock.post.findFirst({
        where: {
          title: 'update-post-with-new-user',
        },
        select: {
          title: true,
          authorId: true,
        },
      });

      expect(realPost).toEqual(mockPost);
    });
  });

  describe('On create post with existing user', () => {
    beforeAll(async () => {
      await prisma.post.update({
        where: {
          title: seededPosts[1].title,
        },
        data: {
          title: 'update-post-with-existing-user',
          author: {
            upsert: {
              create: {
                email: seededUsers[0].email,
                password: 'createpassword',
              },
              update: {
                email: seededUsers[0].email,
                password: 'updatepassword',
              },
            },
          },
        },
      });

      await prismock.post.update({
        where: {
          title: seededPosts[1].title,
        },
        data: {
          title: 'update-post-with-existing-user',
          author: {
            upsert: {
              create: {
                email: seededUsers[0].email,
                password: 'createpassword',
              },
              update: {
                email: seededUsers[0].email,
                password: 'updatepassword',
              },
            },
          },
        },
      });
    });

    it('Should update user', async () => {
      const realUser = await prisma.user.findFirst({
        where: {
          email: seededUsers[0].email,
        },
        select: {
          email: true,
          password: true,
        },
      });

      const mockUser = await prismock.user.findFirst({
        where: {
          email: seededUsers[0].email,
        },
        select: {
          email: true,
          password: true,
        },
      });

      expect(realUser).toEqual(mockUser);
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

      expect(realPost).toEqual(mockPost);
    });
  });
});
