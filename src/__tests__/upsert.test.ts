import { PrismaClient, User } from '@prisma/client';

import { buildUser, formatEntries, formatEntry, resetDb, seededUsers, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(20000);

describe('upsert', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);
  });

  describe('When already exist', () => {
    let realUserResponse: User;
    let mockUserResponse: User;

    beforeAll(async () => {
      realUserResponse = await prisma.user.upsert({
        where: { id: 1 },
        update: { warnings: 99 },
        create: { email: 'user4@company.com', password: 'password' },
      });

      mockUserResponse = await prismock.user.upsert({
        where: { id: 1 },
        update: { warnings: 99 },
        create: { email: 'user4@company.com', password: 'password' },
      });
    });

    it('Should update existing', () => {
      const expected = buildUser(1, { warnings: 99 });
      const realUser = realUserResponse;
      const mockUser = mockUserResponse;

      expect(formatEntry(realUser)).toEqual(formatEntry(expected));
      expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
    });

    it('Should store updated', async () => {
      const expectedStored = [buildUser(1, { warnings: 99 }), seededUsers[1], seededUsers[2]];
      const stored = (await prisma.user.findMany()).sort((a, b) => a.id - b.id);
      const mockStored = prismock.getData().user;

      expect(formatEntries(stored)).toEqual(formatEntries(expectedStored));
      expect(formatEntries(mockStored)).toEqual(formatEntries(expectedStored));
    });
  });

  describe("When doesn't exist", () => {
    let realUser: User;
    let mockUser: User;

    beforeAll(async () => {
      realUser = await prisma.user.upsert({
        where: { id: 4 },
        update: { warnings: 99 },
        create: { email: 'user4@company.com', password: 'password' },
      });

      mockUser = await prismock.user.upsert({
        where: { id: 4 },
        update: { warnings: 99 },
        create: { email: 'user4@company.com', password: 'password' },
      });
    });

    it('Should update existing', () => {
      const expected = buildUser(4);

      expect(formatEntry(realUser)).toEqual(formatEntry(expected));
      expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
    });

    it('Should store updated', async () => {
      const expectedStored = [buildUser(1, { warnings: 99 }), seededUsers[1], seededUsers[2], buildUser(4)];
      const stored = (await prisma.user.findMany()).sort((a, b) => a.id - b.id);
      const mockStored = prismock.getData().user;

      expect(formatEntries(stored)).toEqual(formatEntries(expectedStored));
      expect(formatEntries(mockStored)).toEqual(formatEntries(expectedStored));
    });
  });
});
