import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

describe('aggregate', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();

    simulateSeed(prismock);
    await prisma.user.create({ data: { email: 'user4@company.com', password: 'password' } });
    await prismock.user.create({ data: { email: 'user4@company.com', password: 'password' } });
  });

  it('Should return aggregate', async () => {
    const expected = {
      _max: {
        id: 4,
        warnings: 10,
        friends: 0,
      },
      _avg: {
        id: 2.5,
        friends: 0,
        warnings: 5,
      },
      _count: {
        friends: 4,
        id: 4,
        warnings: 3,
      },
      _min: {
        friends: 0,
        id: 1,
        warnings: 0,
      },
      _sum: {
        friends: 0,
        id: 10,
        warnings: 15,
      },
    };

    const realAggregate = await prisma.user.aggregate({
      _max: {
        id: true,
        warnings: true,
        friends: true,
      },
      _avg: {
        id: true,
        warnings: true,
        friends: true,
      },
      _count: {
        id: true,
        warnings: true,
        friends: true,
      },
      _min: {
        id: true,
        warnings: true,
        friends: true,
      },
      _sum: {
        id: true,
        warnings: true,
        friends: true,
      },
    });

    const mockAggregate = await prismock.user.aggregate({
      _max: {
        id: true,
        warnings: true,
        friends: true,
      },
      _avg: {
        id: true,
        warnings: true,
        friends: true,
      },
      _count: {
        id: true,
        warnings: true,
        friends: true,
      },
      _min: {
        id: true,
        warnings: true,
        friends: true,
      },
      _sum: {
        id: true,
        warnings: true,
        friends: true,
      },
    });

    expect(realAggregate).toEqual(expected);
    expect(mockAggregate).toEqual(expected);
  });

  it('Should return selected aggregate', async () => {
    const expected = {
      _max: {
        id: 2,
        warnings: 5,
        friends: 0,
      },
    };

    const realAggregate = await prisma.user.aggregate({
      _max: {
        id: true,
        warnings: true,
        friends: true,
      },
      where: {
        id: {
          lte: 2,
        },
      },
    });

    const mockAggregate = await prismock.user.aggregate({
      _max: {
        id: true,
        warnings: true,
        friends: true,
      },
      where: {
        id: {
          lte: 2,
        },
      },
    });

    expect(realAggregate).toEqual(expected);
    expect(mockAggregate).toEqual(expected);
  });
});
