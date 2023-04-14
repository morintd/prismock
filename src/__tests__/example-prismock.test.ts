import { PrismockClient } from '../lib/client';
import { PrismaClient } from '@prisma/client';

import { buildUser, formatEntries, formatEntry } from '../../testing';

jest.mock('@prisma/client', () => {
  return {
    ...jest.requireActual('@prisma/client'),
    PrismaClient: PrismockClient,
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
