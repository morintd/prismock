import { PrismaClient, User } from '@prisma/client';

import { formatEntry, resetDb, seededPosts, seededUsers, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('create (connect)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realServiceUser: User;
  let mockServiceUser: User;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    realServiceUser = (await prisma.user.findFirst({ where: { email: seededUsers[0].email } }))!;
    mockServiceUser = (await prismock.user.findFirst({ where: { email: seededUsers[0].email } }))!;
  });

  it('Should create with multiple dependencies and connect to it', async () => {
    const expected = {
      id: expect.anything(),
      title: 'title-create-connect-multiple',
    };

    const mockBlog = await prismock.blog.create({
      data: {
        title: 'title-create-connect-multiple',
        posts: {
          connect: [{ title: seededPosts[0].title }],
        },
        category: 'connect',
      },
      select: {
        id: true,
        title: true,
      },
    });

    const realBlog = await prisma.blog.create({
      data: {
        title: 'title-create-connect-multiple',
        posts: {
          connect: [{ title: seededPosts[0].title }],
        },
        category: 'connect',
      },
      select: {
        id: true,
        title: true,
      },
    });

    expect(realBlog).toEqual(expected);
    expect(mockBlog).toEqual(expected);
  });

  it('Should create with dependency and connect to it', async () => {
    const expected = {
      id: expect.anything(),
      title: 'title-create-connect-single',
    };

    const mockBlog = await prismock.blog.create({
      data: {
        title: 'title-create-connect-single',
        posts: {
          connect: { title: seededPosts[0].title },
        },
        category: 'connect-single',
      },
      select: {
        id: true,
        title: true,
      },
    });

    const realBlog = await prisma.blog.create({
      data: {
        title: 'title-create-connect-single',
        posts: {
          connect: { title: seededPosts[0].title },
        },
        category: 'connect-single',
      },
      select: {
        id: true,
        title: true,
      },
    });

    expect(realBlog).toEqual(expected);
    expect(mockBlog).toEqual(expected);
  });

  it('Should create with dependency + include and connect to it', async () => {
    const realService = await prisma.service.create({
      data: {
        name: 'service-create-connect-include',
        tags: [],
        user: {
          connect: {
            id: realServiceUser.id,
          },
        },
      },
      include: {
        user: true,
      },
    });

    const mockService = await prismock.service.create({
      data: {
        name: 'service-create-connect-include',
        tags: [],
        user: {
          connect: {
            id: mockServiceUser.id,
          },
        },
      },
      include: {
        user: true,
      },
    });

    expect(formatEntry(mockService.user)).toEqual(formatEntry(realService.user));

    const realServiceFind = await prisma.service.findFirst({
      where: {
        name: 'service-create-connect-include',
      },
      include: {
        user: true,
      },
    });

    const mockServiceFind = await prismock.service.findFirst({
      where: {
        name: 'service-create-connect-include',
      },
      include: {
        user: true,
      },
    });

    expect(realServiceFind?.user).toEqual(mockServiceFind?.user);
  });
});
