import { PrismaClient, Role, User } from '@prisma/client';

import { formatEntries, formatEntry, generateId, resetDb, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('delete', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  const data = {
    user1: { email: 'user-delete-1@company.com', password: 'password', warnings: 0 },
    user2: { email: 'user-delete-2@company.com', password: 'password', warnings: 99 },
    user3: { email: 'user-delete-3@company.com', password: 'password', warnings: 99 },
  };

  const expected = [
    {
      banned: false,
      email: 'user-delete-1@company.com',
      friends: 0,
      id: generateId(4),
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
      id: generateId(5),
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
      id: generateId(6),
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
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const user1 = await prisma.user.create({ data: data.user1 });
    const user2 = await prisma.user.create({ data: data.user2 });
    const user3 = await prisma.user.create({ data: data.user3 });

    await prismock.user.createMany({ data: [user1, user2, user3].map(({ id, ...user }) => ({ ...user, parameters: {} })) });
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
      await expect(() => prisma.user.delete({ where: { email: 'does-not-exist' } })).rejects.toThrow();
      await expect(() => prismock.user.delete({ where: { email: 'does-not-exist' } })).rejects.toThrow();
    });
  });
});
