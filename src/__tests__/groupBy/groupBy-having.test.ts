/* eslint-disable no-console */
/* eslint-disable jest/no-conditional-expect */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { PrismaClient, Prisma } from '@prisma/client';

import { resetDb, simulateSeed, buildUser } from '../../../testing';
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

    const users = [
      buildUser(4, { role: 'ADMIN' }),
      buildUser(5, { role: 'ADMIN', friends: 5 }),
      buildUser(6, { role: 'USER', friends: 1 }),
    ];
    await prisma.user.createMany({ data: users });
    await prismock.user.createMany({ data: users });
  });

  it('Should filter items based on a simple key', async () => {
    const expected = [
      {
        friends: 5,
        _count: 1,
      },
      {
        friends: 1,
        _count: 1,
      },
    ];
    const mockGroups = await prismock.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ friends: 'desc' }],
      having: {
        friends: {
          gte: 1,
        },
      },
    });
    const realGroups = await prisma.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ friends: 'desc' }],
      having: {
        friends: {
          gte: 1,
        },
      },
    });

    expect(realGroups).toEqual(expected);
    expect(mockGroups).toEqual(expected);
  });

  it('Should filter items based on aggregates', async () => {
    const expected = [
      {
        friends: 0,
        _count: 4,
      },
    ];

    const mockGroups = await prismock.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ friends: 'asc' }],
      having: {
        warnings: {
          _sum: {
            gt: 5,
          },
        },
      },
    });
    const realGroups = await prisma.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ friends: 'asc' }],
      having: {
        warnings: {
          _sum: {
            gt: 5,
          },
        },
      },
    });

    expect(realGroups).toEqual(expected);
    expect(mockGroups).toEqual(expected);
  });

  it('Should handle complex having conditions based on aggregates', async () => {
    const expected = [
      {
        friends: 0,
        _count: 4,
      },
    ];

    const having: Prisma.UserScalarWhereWithAggregatesInput = {
      OR: [
        {
          warnings: {
            _sum: {
              gt: 5,
            },
          },
        },
        {
          AND: [
            { friends: 0 },
            {
              warnings: {
                _sum: {
                  lt: 5,
                },
              },
            },
          ],
        },
      ],
    };

    const mockGroups = await prismock.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ friends: 'asc' }],
      having,
    });
    const realGroups = await prisma.user.groupBy({
      by: ['friends'],
      _count: true,
      orderBy: [{ friends: 'asc' }],
      having,
    });

    expect(realGroups).toEqual(expected);
    expect(mockGroups).toEqual(expected);
  });
});
