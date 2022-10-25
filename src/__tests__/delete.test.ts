import { PrismaClient, Role, User } from '@prisma/client';

import { formatEntries, formatEntry, resetDb, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(20000);

describe('delete', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  const data = {
    user1: { email: 'user-delete-1@company.com', password: 'password' },
    user2: { email: 'user-delete-2@company.com', password: 'password', warnings: 99 },
    user3: { email: 'user-delete-3@company.com', password: 'password', warnings: 99 },
  };

  const expected = [
    {
      banned: false,
      email: 'user-delete-1@company.com',
      friends: 0,
      id: 4,
      money: BigInt(0),
      parameters: {},
      password: 'password',
      role: Role.USER,
      signal: null,
      warnings: 0,
    },
    {
      banned: false,
      email: 'user-delete-2@company.com',
      friends: 0,
      id: 5,
      money: BigInt(0),
      parameters: {},
      password: 'password',
      role: Role.USER,
      signal: null,
      warnings: 99,
    },
    {
      banned: false,
      email: 'user-delete-3@company.com',
      friends: 0,
      id: 6,
      money: BigInt(0),
      parameters: {},
      password: 'password',
      role: Role.USER,
      signal: null,
      warnings: 99,
    },
  ];

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);

    const user1 = await prisma.user.create({ data: data.user1 });
    const user2 = await prisma.user.create({ data: data.user2 });
    const user3 = await prisma.user.create({ data: data.user3 });

    prismock.setData({ user: [...prismock.getData().user, user1, user2, user3] });
    expect(formatEntries(prismock.getData().user.slice(-3))).toEqual(formatEntries(expected));
  });

  describe('delete', () => {
    let realDelete: User;
    let mockDelete: User;

    beforeAll(async () => {
      realDelete = await prisma.user.delete({ where: { email: 'user-delete-1@company.com' } });
      mockDelete = await prismock.user.delete({ where: { email: 'user-delete-1@company.com' } });
    });

    it('Should delete a single element', () => {
      expect(formatEntry(realDelete)).toEqual(formatEntry(expected[0]));
      expect(formatEntry(mockDelete)).toEqual(formatEntry(expected[0]));
    });

    it('Should delete user from stored data', async () => {
      const stored = await prisma.user.findMany();
      const mockStored = prismock.getData().user;

      expect(stored.find((user) => user.email === 'user-delete-1@company.com')).toBeUndefined();
      expect(mockStored.find((user) => user.email === 'user-delete-1@company.com')).toBeUndefined();
    });

    it('Should throw if no element is found', async () => {
      await expect(() => prisma.user.delete({ where: { id: -1 } })).rejects.toThrow();
      await expect(() => prismock.user.delete({ where: { id: -1 } })).rejects.toThrow();
    });
  });

  describe('deleteMany', () => {
    it('Should return count', async () => {
      expect(await prisma.post.deleteMany({})).toEqual({ count: 2 });
      expect(await prismock.post.deleteMany({})).toEqual({ count: 2 });
    });

    it('Should return count 0 for no match', async () => {
      expect(await prisma.user.deleteMany({ where: { id: 99 } })).toEqual({ count: 0 });
      expect(await prismock.user.deleteMany({ where: { id: 99 } })).toEqual({ count: 0 });
    });
  });
});
