import { PrismaClient } from '@prisma/client';

describe('Example', () => {
  describe('Without mock', () => {
    it('Should throw as user email is taken', async () => {
      const prisma = new PrismaClient();
      return expect(prisma.user.create({ data: { email: 'user1@company.com', password: 'password' } })).rejects.toThrow();
    });
  });
});
