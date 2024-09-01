import { PrismaClient } from '@prisma/client';

import { buildSubscription, resetDb, seededBlogs, seededUsers, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('find (many-to-many)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const realBlogs = await prisma.blog.findMany();
    const mockBlogs = await prismock.blog.findMany();

    const realUsers = await prisma.user.findMany();
    const mockUsers = await prismock.user.findMany();

    await prisma.subscription.createMany({
      data: [
        buildSubscription(1, {
          blogId: realBlogs[0].id,
          userId: realUsers[0].id,
        }),
        buildSubscription(2, {
          blogId: realBlogs[0].id,
          userId: realUsers[1].id,
        }),
      ],
    });

    await prismock.subscription.createMany({
      data: [
        buildSubscription(1, {
          blogId: mockBlogs[0].id,
          userId: mockUsers[0].id,
        }),
        buildSubscription(2, {
          blogId: mockBlogs[0].id,
          userId: mockUsers[1].id,
        }),
      ],
    });
  });

  it('Should return data with manyToMany relation', async () => {
    const realUsers = await prisma.user.findFirst({
      select: {
        email: true,
        subscriptions: {
          select: {
            blog: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    const mockUsers = await prismock.user.findFirst({
      select: {
        email: true,
        subscriptions: {
          select: {
            blog: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    expect(realUsers).toEqual(mockUsers);
  });

  it('Should return empty data with manyToMany relation', async () => {
    const realUsers = await prisma.user.findFirst({
      where: {
        email: seededUsers[2].email,
      },
      select: {
        email: true,
        subscriptions: {
          select: {
            blog: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    const mockUsers = await prismock.user.findFirst({
      where: {
        email: seededUsers[2].email,
      },
      select: {
        email: true,
        subscriptions: {
          select: {
            blog: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });

    expect(realUsers).toEqual(mockUsers);
  });

  it('Should return data with manyToMany relation (reversed)', async () => {
    const realBlog = await prisma.blog.findFirst({
      select: {
        title: true,
        subscriptions: {
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    const mockBlog = await prismock.blog.findFirst({
      select: {
        title: true,
        subscriptions: {
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    expect(realBlog).toEqual(mockBlog);
  });

  it('Should returne empty data with manyToMany relation (reversed)', async () => {
    const realBlog = await prisma.blog.findFirst({
      where: {
        title: seededBlogs[1].title,
      },
      select: {
        title: true,
        subscriptions: {
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    const mockBlog = await prismock.blog.findFirst({
      where: {
        title: seededBlogs[1].title,
      },
      select: {
        title: true,
        subscriptions: {
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    expect(realBlog).toEqual(mockBlog);
  });
});
