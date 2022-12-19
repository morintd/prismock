import { PrismaClient } from '@prisma/client';

import { resetDb } from '../../testing';

jest.setTimeout(40000);

describe('Example', () => {
  describe('Without mock', () => {
    beforeAll(async () => {
      await resetDb();
    });

    it('Should throw as user email is taken', async () => {
      const prisma = new PrismaClient();
      return expect(prisma.user.create({ data: { email: 'user1@company.com', password: 'password' } })).rejects.toThrow();
    });
  });
});
