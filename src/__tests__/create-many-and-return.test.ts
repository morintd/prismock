/* eslint-disable jest/no-conditional-expect */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { PrismockClient, PrismockClientType } from '../lib/client';
import { resetDb } from '../../testing';
import { PrismaClient, User } from '@prisma/client';
import { fetchGenerator, getProvider } from '../lib/prismock';

jest.setTimeout(40000);

describe('createManyAndReturn', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;
  let provider: string;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;

    const generator = await fetchGenerator();
    provider = getProvider(generator);
    generator.stop();
  });

  describe('On success', () => {
    let realUsers: Pick<User, 'email' | 'password' | 'warnings' | 'banned'>[];
    let mockUsers: Pick<User, 'email' | 'password' | 'warnings' | 'banned'>[];

    beforeAll(async () => {
      if (provider === 'postgresql') {
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
      }
    });

    it('Should return created', () => {
      if (provider === 'postgresql') {
        expect(realUsers).toEqual(mockUsers);
      }
    });

    it('Should create', async () => {
      if (provider === 'postgresql') {
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
      }
    });
  });
});
