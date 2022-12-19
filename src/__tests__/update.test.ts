import { PrismaClient } from '@prisma/client';

import { buildUser, formatEntries, formatEntry, resetDb, seededUsers, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { Item } from '../lib/delegate';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(40000);

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
      where: { email: seededUsers[0].email },
      data: { warnings: 99, email: undefined },
    });
    mockUpdate = await prismock.user.update({
      where: { email: seededUsers[0].email },
      data: { warnings: 99, email: undefined },
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
    const stored = (await prisma.user.findMany()).sort((a, b) => a.id.toString().localeCompare(b.id.toString()));

    expect(formatEntries(stored)).toEqual(formatEntries(expectedStore));
    expect(formatEntries(mockStored)).toEqual(formatEntries(expectedStore));
  });

  it('Should not update keys with `undefined` as value', () => {
    const expected = buildUser(1, { warnings: 99, email: seededUsers[0].email });

    expect(formatEntry(realUpdate)).toEqual(formatEntry(expected));
    expect(formatEntry(mockUpdate)).toEqual(formatEntry(expected));
  });
});
