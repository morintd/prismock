import { Prisma, PrismaClient, Role, User } from '@prisma/client';

import { buildUser, resetDb, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/prisma-mock?schema=public';

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
      grade: new Prisma.Decimal(24.454545),
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

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: Object.values(data).map(({ email }) => email) } } });
  });

  describe('create', () => {
    it('Should create (with default value)', () => {
      const expected = buildUser(4, {});

      expect(realUsers[0]).toEqual(expected);
      expect(mockUsers[0]).toEqual(expected);
    });

    it('Should create (with default date value)', async () => {
      const expected = { id: 3, title: 'title3', authorId: 1 };
      const realPost = await prisma.post.create({ data: { title: 'title3', authorId: 1 } });
      const mockPost = await prismock.post.create({ data: { title: 'title3', authorId: 1 } });

      const { createdAt: realPostCreatedAt, ...expectedRealPost } = realPost;
      const { createdAt: mockPostCreatedAt, ...expectedMockPost } = mockPost;

      expect(expectedRealPost).toEqual(expected);
      expect(realPostCreatedAt).toBeInstanceOf(Date);

      expect(expectedMockPost).toEqual(expected);
      expect(mockPostCreatedAt).toBeInstanceOf(Date);
    });

    it('Should create with increment', () => {
      const expected = buildUser(5, {});

      expect(realUsers[1]).toEqual(expected);
      expect(mockUsers[1]).toEqual(expected);
    });

    it('Should create without default value if already set', () => {
      const expected = buildUser(6, {
        role: Role.ADMIN,
        banned: true,
        friends: 1,
        grade: new Prisma.Decimal(24.454545),
        money: BigInt('534543543534'),
        parameters: { content: true },
        signal: Buffer.from([1, 2, 3, 4]),
        warnings: 1,
      });

      expect(realUsers[2]).toEqual(expected);
      expect(mockUsers[2]).toEqual(expected);
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
          grade: new Prisma.Decimal(0),
          id: 7,
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
          grade: new Prisma.Decimal(0),
          id: 8,
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
