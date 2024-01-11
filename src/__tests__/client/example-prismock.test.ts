/* eslint-disable jest/no-conditional-expect */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { PrismaClient } from '@prisma/client';

import { buildUser, formatEntries, formatEntry } from '../../../testing';
import { fetchGenerator, getProvider } from '../../lib/prismock';

jest.mock('@prisma/client', () => {
  return {
    ...jest.requireActual('@prisma/client'),
    PrismaClient: jest.requireActual('../../').PrismockClient,
  };
});

describe('Example', () => {
  let provider: string;

  beforeAll(async () => {
    const generator = await fetchGenerator();
    provider = getProvider(generator);
    generator.stop();
  });

  describe('With mock', () => {
    it('Should use prismock instead of prisma', async () => {
      const prisma = new PrismaClient();

      const user = await prisma.user.create({ data: { email: 'user1@company.com', password: 'password', warnings: 0 } });
      const found = await prisma.user.findMany();

      expect(formatEntry(user)).toEqual(formatEntry(buildUser(1)));
      expect(formatEntries(found)).toEqual(formatEntries([user]));
    });

    it('Should allow mocking queries', () => {
      if (provider === 'postgresql') {
        const prisma = new PrismaClient();

        jest.spyOn(prisma, '$queryRaw').mockResolvedValue(42);

        return expect(prisma.$queryRaw`SOME QUERIES`).resolves.toBe(42);
      }
    });
  });
});
