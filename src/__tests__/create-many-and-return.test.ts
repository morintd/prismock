import { PrismockClient, PrismockClientType } from '../lib/client';
import { resetDb } from '../../testing';
import { PrismaClient, User } from '@prisma/client';

jest.setTimeout(40000);

describe('createManyAndReturn', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
  });

  describe('On success', () => {
    let realUsers: Pick<User, 'email' | 'password' | 'warnings' | 'banned'>[];
    let mockUsers: Pick<User, 'email' | 'password' | 'warnings' | 'banned'>[];

    beforeAll(async () => {
      realUsers = await prisma.user.createManyAndReturn({
        data: [
          { email: 'user-1@company.com', password: 'password', warnings: 0 },
          { email: 'user-2@company.com', password: 'password', warnings: 0 },
        ],
        select: {
          email: true,
          password: true,
          warnings: true,
          banned: true,
        },
      });

      mockUsers = await prismock.user.createManyAndReturn({
        data: [
          { email: 'user-1@company.com', password: 'password', warnings: 0 },
          { email: 'user-2@company.com', password: 'password', warnings: 0 },
        ],
        select: {
          email: true,
          password: true,
          warnings: true,
          banned: true,
        },
      });
    });

    it('Should return created', () => {
      expect(realUsers).toEqual(mockUsers);
    });

    it('Should create', async () => {
      const createdRealUsers = await prisma.user.findMany({
        select: {
          email: true,
          password: true,
          warnings: true,
          banned: true,
        },
      });

      const createdMockUsers = await prisma.user.findMany({
        select: {
          email: true,
          password: true,
          warnings: true,
          banned: true,
        },
      });

      expect(createdRealUsers).toEqual(createdMockUsers);
    });
  });
});
