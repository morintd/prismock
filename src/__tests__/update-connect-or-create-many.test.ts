import { PrismaClient } from '@prisma/client';

import { resetDb, seededPosts, seededUsers, simulateSeed } from '../../testing';
import { PrismockClient, PrismockClientType } from '../lib/client';

jest.setTimeout(40000);

describe('update (connectOrCreate)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  const select = {
    title: true,
    author: {
      select: {
        email: true,
      },
    },
  };

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    simulateSeed(prismock);
  });

  it('Should update and connect to existing', async () => {
    const mockPost = await prismock.post.update({
      data: {
        title: 'title-connect',
        author: {
          connectOrCreate: {
            create: {
              email: seededUsers[1].email,
              password: seededUsers[1].password,
            },
            where: {
              email: seededUsers[1].email,
            },
          },
        },
      },
      select,
      where: {
        title: seededPosts[0].title,
      },
    });

    const realPost = await prisma.post.update({
      data: {
        title: 'title-connect',
        author: {
          connectOrCreate: {
            create: {
              email: seededUsers[1].email,
              password: seededUsers[1].password,
            },
            where: {
              email: seededUsers[1].email,
            },
          },
        },
      },
      select,
      where: {
        title: seededPosts[0].title,
      },
    });

    expect(realPost).toEqual({
      title: 'title-connect',
      author: {
        email: seededUsers[1].email,
      },
    });
    expect(mockPost).toEqual({
      title: 'title-connect',
      author: {
        email: seededUsers[1].email,
      },
    });
  });

  it('Should update with dependencies and connect to it', async () => {
    const mockPost = await prismock.post.update({
      data: {
        title: 'title-connect-create',
        author: {
          connectOrCreate: {
            create: {
              email: 'new@user.com',
              password: 'password',
            },
            where: {
              email: 'new@user.com',
            },
          },
        },
      },
      where: {
        title: seededPosts[1].title,
      },
      select,
    });
    const mockAuthor = await prismock.user.findUnique({ where: { email: 'new@user.com' } });

    const realPost = await prisma.post.update({
      data: {
        title: 'title-connect-create',
        author: {
          connectOrCreate: {
            create: {
              email: 'new@user.com',
              password: 'password',
            },
            where: {
              email: 'new@user.com',
            },
          },
        },
      },
      where: {
        title: seededPosts[1].title,
      },
      select,
    });
    const realAuthor = await prisma.user.findUnique({ where: { email: 'new@user.com' } });

    expect(realPost).toEqual({
      title: 'title-connect-create',
      author: {
        email: 'new@user.com',
      },
    });
    expect(realAuthor).toBeDefined();

    expect(mockPost).toEqual({
      title: 'title-connect-create',
      author: {
        email: 'new@user.com',
      },
    });
    expect(mockAuthor).toBeDefined();
  });
});
