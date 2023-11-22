import { PrismaClient } from '@prisma/client';

import { buildUser, resetDb, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('groupBy', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
    const users = [buildUser(4, { role: 'ADMIN' })];
    await prisma.user.createMany({ data: users });
    await prismock.user.createMany({ data: users });
  });

  it('Should get all matching groups', async () => {
    const realCount = await prisma.post.groupBy({
      by: ['authorId'],
    });

    const mockCount = await prismock.post.groupBy({
      by: ['authorId'],
    });

    expect(realCount).toHaveLength(2);
    expect(realCount).toEqual(
      expect.arrayContaining([
        {
          authorId: 1,
        },
        {
          authorId: 2,
        },
      ]),
    );

    expect(mockCount).toHaveLength(2);
    expect(mockCount).toEqual(
      expect.arrayContaining([
        {
          authorId: 1,
        },
        {
          authorId: 2,
        },
      ]),
    );
  });

  it('Should aggregate groups', async () => {
    const expected = [
      {
        role: 'ADMIN',
        _count: 1,
        _avg: {
          friends: 0,
          warnings: 0,
        },
        _max: {
          friends: 0,
          warnings: 0,
        },
        _min: {
          friends: 0,
          warnings: 0,
        },
        _sum: {
          friends: 0,
          warnings: 0,
        },
      },
      {
        role: 'USER',
        _count: 3,
        _avg: {
          friends: 0,
          warnings: 5,
        },
        _max: {
          friends: 0,
          warnings: 10,
        },
        _min: {
          friends: 0,
          warnings: 0,
        },
        _sum: {
          friends: 0,
          warnings: 15,
        },
      },
    ];

    const realAggregate = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
      _avg: {
        warnings: true,
        friends: true,
      },
      _min: {
        warnings: true,
        friends: true,
      },
      _max: {
        warnings: true,
        friends: true,
      },
      _sum: {
        warnings: true,
        friends: true,
      },
    });

    const mockAggregate = await prismock.user.groupBy({
      by: ['role'],
      _count: true,
      _avg: {
        warnings: true,
        friends: true,
      },
      _min: {
        warnings: true,
        friends: true,
      },
      _max: {
        warnings: true,
        friends: true,
      },
      _sum: {
        warnings: true,
        friends: true,
      },
    });

    expect(realAggregate).toHaveLength(2);
    expect(realAggregate).toEqual(expect.arrayContaining(expected));

    expect(mockAggregate).toHaveLength(2);
    expect(mockAggregate).toEqual(expect.arrayContaining(expected));
  });
});
