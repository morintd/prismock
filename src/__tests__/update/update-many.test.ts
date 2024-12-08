import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed, buildUser, formatEntries, generateId } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('updateMany', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realUpdateMany: { count: number };
  let mockUpdateMany: { count: number };

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    realUpdateMany = await prisma.user.updateMany({
      where: { email: { in: ['user2@company.com', 'user3@company.com'] } },
      data: { warnings: 99 },
    });
    mockUpdateMany = await prismock.user.updateMany({
      where: { email: { in: ['user2@company.com', 'user3@company.com'] } },
      data: { warnings: 99 },
    });
  });

  it('Should return count', () => {
    expect(realUpdateMany).toEqual({ count: 2 });
    expect(mockUpdateMany).toEqual({ count: 2 });
  });

  it('Should return count 0 if not match', async () => {
    expect(await prisma.user.updateMany({ where: { id: generateId(0) }, data: { warnings: 50 } })).toEqual({ count: 0 });
    expect(await prismock.user.updateMany({ where: { id: generateId(0) }, data: { warnings: 50 } })).toEqual({ count: 0 });
  });

  it('Should update stored data', async () => {
    const expectedStore = [buildUser(1, { warnings: 0 }), buildUser(2, { warnings: 99 }), buildUser(3, { warnings: 99 })];
    const mockStored = prismock.getData().user;
    const stored = await prisma.user.findMany();

    expect(formatEntries(stored)).toEqual(formatEntries(expectedStore));
    expect(formatEntries(mockStored)).toEqual(formatEntries(expectedStore));
  });
});
