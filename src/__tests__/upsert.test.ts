import { PrismaClient, User } from '@prisma/client';

import { buildUser, formatEntries, formatEntry, generateId, resetDb, seededUsers, simulateSeed } from '../../testing';
import { PrismockClient, PrismockClientType } from '../lib/client';

jest.setTimeout(40000);

describe('upsert', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
  });

  describe('When already exist', () => {
    let realUserResponse: User;
    let mockUserResponse: User;

    beforeAll(async () => {
      realUserResponse = await prisma.user.upsert({
        where: { email: seededUsers[0].email },
        update: { warnings: 99 },
        create: { email: 'user4@company.com', password: 'password', warnings: 0 },
      });

      mockUserResponse = await prismock.user.upsert({
        where: { email: seededUsers[0].email },
        update: { warnings: 99 },
        create: { email: 'user4@company.com', password: 'password', warnings: 0 },
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
      const stored = (await prisma.user.findMany()).sort((a, b) => a.id.toString().localeCompare(b.id.toString()));
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
        where: { id: generateId(4) },
        update: { warnings: 99 },
        create: { email: 'user4@company.com', password: 'password', warnings: 0 },
      });

      mockUser = await prismock.user.upsert({
        where: { id: generateId(4) },
        update: { warnings: 99 },
        create: { email: 'user4@company.com', password: 'password', warnings: 0 },
      });
    });

    it('Should update existing', () => {
      const expected = buildUser(4);

      expect(formatEntry(realUser)).toEqual(formatEntry(expected));
      expect(formatEntry(mockUser)).toEqual(formatEntry(expected));
    });

    it('Should store updated', async () => {
      const expectedStored = [buildUser(1, { warnings: 99 }), seededUsers[1], seededUsers[2], buildUser(4)];
      const stored = (await prisma.user.findMany()).sort((a, b) => a.email.localeCompare(b.email));
      const mockStored = prismock.getData().user;

      expect(formatEntries(stored)).toEqual(formatEntries(expectedStored));
      expect(formatEntries(mockStored)).toEqual(formatEntries(expectedStored));
    });
  });
});
