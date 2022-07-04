import { PrismaClient } from '@prisma/client';

import { generatePrismock } from '../lib/prismock';
import { buildUser } from '../../testing';

jest.mock('@prisma/client', () => {
  return {
    ...jest.requireActual('@prisma/client'),
    PrismaClient: jest.fn(),
  };
});

describe('Example', () => {
  describe('With mock', () => {
    beforeAll(async () => {
      const prismock = await generatePrismock();
      (PrismaClient as jest.Mock).mockReturnValue(prismock);
    });

    it('Should use prismock instead of prisma', async () => {
      const prisma = new PrismaClient();

      const user = await prisma.user.create({ data: { email: 'user1@company.com', password: 'password' } });
      const found = await prisma.user.findMany();

      expect(user).toEqual(buildUser(1));
      expect(found).toEqual([user]);
    });
  });
});
