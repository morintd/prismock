import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed } from '../../testing';
import { PrismockClient } from '../lib/client';
import { generatePrismock } from '../lib/prismock';

jest.setTimeout(20000);

describe('count', () => {
  let prismock: PrismockClient;
  let prisma: PrismaClient;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = await generatePrismock();
    simulateSeed(prismock);
  });

  it('Should return count', async () => {
    const realCount = await prisma.user.count({ where: { warnings: { gt: 0 } } });
    const mockCount = await prismock.user.count({ where: { warnings: { gt: 0 } } });

    expect(realCount).toBe(2);
    expect(mockCount).toBe(2);
  });
});
