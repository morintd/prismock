import { PrismaClient, Role, User } from '@prisma/client';

import {
  buildUser,
  formatEntries,
  formatEntry,
  generateId,
  isUUID,
  resetDb,
  seededBlogs,
  seededUsers,
  simulateSeed,
} from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('create', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  const mockUsers: User[] = [];
  const realUsers: User[] = [];

  const data = {
    user1: { email: 'user4@company.com', password: 'password', warnings: 0 },
    user2: { email: 'user5@company.com', password: 'password', warnings: 0 },
    user3: {
      email: 'user6@company.com',
      password: 'password',
      role: Role.ADMIN,
      banned: true,
      friends: 1,
      money: BigInt('534543543534'),
      parameters: { content: true },
      signal: Buffer.from([1, 2, 3, 4]),
      warnings: 1,
    },
    user4: { email: 'user-many-1@company.com', password: 'password', warnings: 0 },
    user5: { email: 'user-many-2@company.com', password: 'password', warnings: 0 },
  };

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    simulateSeed(prismock);

    mockUsers.push(await prismock.user.create({ data: data.user1 }));
    mockUsers.push(await prismock.user.create({ data: data.user2 }));
    mockUsers.push(await prismock.user.create({ data: data.user3 }));

    realUsers.push(await prisma.user.create({ data: data.user1 }));
    realUsers.push(await prisma.user.create({ data: data.user2 }));
    realUsers.push(await prisma.user.create({ data: data.user3 }));
  });

  describe('create', () => {
    it('Should create (with default value)', () => {
      const expected = buildUser(4, {});

      expect(formatEntry(realUsers[0])).toEqual(formatEntry(expected));
      expect(formatEntry(mockUsers[0])).toEqual(formatEntry(expected));
    });

    it('Should create (with default date value)', async () => {
      const expected = { id: generateId(3), title: 'title3', authorId: seededUsers[0].id, blogId: seededBlogs[0].id };
      const realPost = await prisma.post.create({
        data: { title: 'title3', authorId: seededUsers[0].id, blogId: seededBlogs[0].id },
      });
      const mockPost = await prismock.post.create({
        data: { title: 'title3', authorId: seededUsers[0].id, blogId: seededBlogs[0].id },
      });

      const { createdAt: realPostCreatedAt, imprint: realImprint, ...expectedRealPost } = realPost;
      const { createdAt: mockPostCreatedAt, imprint: mockImprint, ...expectedMockPost } = mockPost;

      expect(formatEntry(expectedRealPost)).toEqual(formatEntry(expected));
      expect(realPostCreatedAt).toBeInstanceOf(Date);
      expect(isUUID(realImprint)).toBe(true);

      expect(formatEntry(expectedMockPost)).toEqual(formatEntry(expected));
      expect(mockPostCreatedAt).toBeInstanceOf(Date);
      expect(isUUID(mockImprint)).toBe(true);
    });

    it('Should create with increment', () => {
      const expected = buildUser(5, {});

      expect(formatEntry(realUsers[1])).toEqual(formatEntry(expected));
      expect(formatEntry(mockUsers[1])).toEqual(formatEntry(expected));
    });

    it('Should create without default value if already set', () => {
      const expected = buildUser(6, {
        role: Role.ADMIN,
        banned: true,
        friends: 1,
        money: BigInt('534543543534'),
        parameters: { content: true },
        signal: Buffer.from([1, 2, 3, 4]),
        warnings: 1,
      });

      expect(formatEntry(realUsers[2])).toEqual(formatEntry(expected));
      expect(formatEntry(mockUsers[2])).toEqual(formatEntry(expected));
    });

    it('Should create and return item with nested select', async () => {
      const expected = {
        title: 'article-with-select',
        author: {
          email: data.user1.email,
        },
      };
      const select = {
        title: true,
        author: {
          select: {
            email: true,
          },
        },
      };

      const realPost = await prisma.post.create({
        data: { title: 'article-with-select', authorId: realUsers[0].id, blogId: seededBlogs[0].id },
        select,
      });

      const mockPost = await prismock.post.create({
        data: { title: 'article-with-select', authorId: mockUsers[0].id, blogId: seededBlogs[0].id },
        select,
      });

      expect(realPost).toEqual(expected);
      expect(mockPost).toEqual(expected);
    });
  });

  describe('createMany', () => {
    let mockResponse: { count: number };
    let realResponse: { count: number };

    beforeAll(async () => {
      mockResponse = await prismock.user.createMany({ data: [data.user4, data.user5] });
      realResponse = await prisma.user.createMany({ data: [data.user4, data.user5] });
    });
    it('Should create', async () => {
      const expectedUsers = [
        {
          banned: false,
          email: 'user-many-1@company.com',
          friends: 0,
          id: generateId(7),
          money: BigInt(0),
          parameters: {},
          password: 'password',
          role: 'USER',
          signal: null,
          warnings: 0,
        },
        {
          banned: false,
          email: 'user-many-2@company.com',
          friends: 0,
          id: generateId(8),
          money: BigInt(0),
          parameters: {},
          password: 'password',
          role: 'USER',
          signal: null,
          warnings: 0,
        },
      ];

      const mockUsers = prismock.getData().user.slice(-2);
      const realUsers = await prisma.user.findMany({
        where: { email: { in: ['user-many-1@company.com', 'user-many-2@company.com'] } },
      });

      expect(formatEntries(mockUsers)).toEqual(formatEntries(expectedUsers));
      expect(formatEntries(realUsers)).toEqual(formatEntries(expectedUsers));
    });

    it('Should return count', () => {
      const expected = { count: 2 };

      expect(mockResponse).toEqual(expected);
      expect(realResponse).toEqual(expected);
    });
  });
});
