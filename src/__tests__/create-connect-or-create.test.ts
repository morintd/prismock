import { PrismaClient } from '@prisma/client';

import { resetDb, seededBlogs, seededUsers, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

describe('create (connectOrCreate)', () => {
  let prismock: PrismockClient;
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
    prismock = await generatePrismock();
    simulateSeed(prismock);
  });

  it('Should create and connect to existing', async () => {
    const mockPost = await prismock.post.create({
      data: {
        title: 'title-connect',
        blog: {
          connect: {
            title: seededBlogs[0].title,
          },
        },
        author: {
          connectOrCreate: {
            create: {
              email: seededUsers[0].email,
              password: seededUsers[0].password,
            },
            where: {
              email: seededUsers[0].email,
            },
          },
        },
      },
      select,
    });

    const realPost = await prisma.post.create({
      data: {
        title: 'title-connect',
        blog: {
          connect: {
            title: seededBlogs[0].title,
          },
        },
        author: {
          connectOrCreate: {
            create: {
              email: seededUsers[0].email,
              password: seededUsers[0].password,
            },
            where: {
              email: seededUsers[0].email,
            },
          },
        },
      },
      select,
    });

    expect(realPost).toEqual({
      title: 'title-connect',
      author: {
        email: seededUsers[0].email,
      },
    });
    expect(mockPost).toEqual({
      title: 'title-connect',
      author: {
        email: seededUsers[0].email,
      },
    });
  });

  it('Should create with dependencies and connect to it', async () => {
    const mockPost = await prismock.post.create({
      data: {
        title: 'title-connect-create',
        blog: {
          connect: {
            title: seededBlogs[0].title,
          },
        },
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
      select,
    });
    const mockAuthor = await prismock.user.findUnique({ where: { email: 'new@user.com' } });

    const realPost = await prisma.post.create({
      data: {
        title: 'title-connect-create',
        blog: {
          connect: {
            title: seededBlogs[0].title,
          },
        },
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
