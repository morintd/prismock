import { PrismaClient, Role, User } from '@prisma/client';

import { PrismockClient } from '../../src/lib/client';
import { generatePrismock } from '../../src/lib/prismock';
import { buildUser, isUUID, resetDb, simulateSeed } from '../../testing';
import { hasObjectIdStructure } from '../../testing/index.mongodb';

jest.setTimeout(20000);

describe('create', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  const mockUsers: User[] = [];
  const realUsers: User[] = [];

  const data = {
    user1: { email: 'user4@company.com', password: 'password' },
    user2: { email: 'user5@company.com', password: 'password' },
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
    user4: { email: 'user-many-1@company.com', password: 'password' },
    user5: { email: 'user-many-2@company.com', password: 'password' },
  };

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
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
      const { id: expectedId, ...expected } = buildUser(4, {});

      const { id: realUserId, ...realUser } = realUsers[0];
      const { id: mockUserId, ...mockUser } = mockUsers[0];

      expect(realUser).toEqual(expected);
      expect(mockUser).toEqual(expected);

      expect(hasObjectIdStructure(realUserId)).toBe(true);
      expect(hasObjectIdStructure(mockUserId)).toBe(true);
      expect(hasObjectIdStructure(expectedId)).toBe(true);
    });

    it('Should create (with default date value)', async () => {
      const expected = { title: 'title3', authorId: realUsers[0].id };
      const realPost = await prisma.post.create({ data: { title: 'title3', authorId: realUsers[0].id } });
      const mockPost = await prismock.post.create({ data: { title: 'title3', authorId: realUsers[0].id } });

      const { id: realPostId, createdAt: realPostCreatedAt, imprint: realImprint, ...expectedRealPost } = realPost;
      const { id: mockPostId, createdAt: mockPostCreatedAt, imprint: mockImprint, ...expectedMockPost } = mockPost;

      expect(expectedRealPost).toEqual(expected);
      expect(realPostCreatedAt).toBeInstanceOf(Date);
      expect(isUUID(realImprint)).toBe(true);

      expect(expectedMockPost).toEqual(expected);
      expect(mockPostCreatedAt).toBeInstanceOf(Date);
      expect(isUUID(mockImprint)).toBe(true);

      expect(hasObjectIdStructure(realPostId)).toBe(true);
      expect(hasObjectIdStructure(mockPostId)).toBe(true);
    });

    it('Should create without default value if already set', () => {
      const { id: expectedId, ...expected } = buildUser(6, {
        role: Role.ADMIN,
        banned: true,
        friends: 1,
        money: BigInt('534543543534'),
        parameters: { content: true },
        signal: Buffer.from([1, 2, 3, 4]),
        warnings: 1,
      });

      const { id: realId, ...realUser } = realUsers[2];
      const { id: mockId, ...mockUser } = realUsers[2];

      expect(realUser).toEqual(expected);
      expect(mockUser).toEqual(expected);
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
          money: BigInt(0),
          parameters: {},
          password: 'password',
          role: 'USER',
          signal: null,
          warnings: 0,
        },
      ];

      const mockUsers = prismock
        .getData()
        .user.slice(-2)
        .map(({ id, ...user }) => user);
      const realUsers = await prisma.user
        .findMany({
          where: { email: { in: ['user-many-1@company.com', 'user-many-2@company.com'] } },
        })
        .then((users) => users.map(({ id, ...user }) => user));

      expect(mockUsers).toEqual(expectedUsers);
      expect(realUsers).toEqual(expectedUsers);
    });

    it('Should return count', () => {
      const expected = { count: 2 };

      expect(mockResponse).toEqual(expected);
      expect(realResponse).toEqual(expected);
    });
  });
});
