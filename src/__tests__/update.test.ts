import { PrismaClient } from '@prisma/client';

import { buildUser, formatEntries, formatEntry, resetDb, seededUsers, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { Item } from '../lib/delegate';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(20000);

describe('update', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  let realUpdate: Item;
  let mockUpdate: Item;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);

    realUpdate = await prisma.user.update({
      where: { id: seededUsers[0].id },
      data: { warnings: 99 },
    });
    mockUpdate = await prismock.user.update({
      where: { id: seededUsers[0].id },
      data: { warnings: 99 },
    });
  });

  it('Should return updated item', () => {
    const expected = buildUser(1, { warnings: 99 });

    expect(formatEntry(realUpdate)).toEqual(formatEntry(expected));
    expect(formatEntry(mockUpdate)).toEqual(formatEntry(expected));
  });

  it('Should update stored data', async () => {
    const expectedStore = [buildUser(1, { warnings: 99 }), seededUsers[1], seededUsers[2]];
    const mockStored = prismock.getData().user;
    const stored = (await prisma.user.findMany()).sort((a, b) => a.id - b.id);

    expect(formatEntries(stored)).toEqual(formatEntries(expectedStore));
    expect(formatEntries(mockStored)).toEqual(formatEntries(expectedStore));
  });
});
