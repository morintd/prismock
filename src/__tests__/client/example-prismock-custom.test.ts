import { PrismaClient } from '.prisma-custom/client';

import { buildUser, formatEntries, formatEntry } from '../../../testing';

// This path existing depends on <rootDir>/testing/global-setup.ts running properly.
jest.mock('.prisma-custom/client', () => {
  const actual = jest.requireActual('.prisma-custom/client');
  return {
    ...actual,
    PrismaClient: jest.requireActual('../../').createPrismock(actual.Prisma),
  };
});

describe('Example', () => {
  describe('With mock', () => {
    it('Should use prismock instead of prisma', async () => {
      const prisma = new PrismaClient();

      const user = await prisma.user.create({ data: { email: 'user1@company.com', password: 'password', warnings: 0 } });
      const found = await prisma.user.findMany();

      expect(formatEntry(user)).toEqual(formatEntry(buildUser(1)));
      expect(formatEntries(found)).toEqual(formatEntries([user]));
    });
  });
});
