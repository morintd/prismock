import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed } from '../../../testing';
import { PrismockClient, createPrismock } from '../../lib/client';
import { Prisma as CustomPrisma } from '../../../node_modules/.prisma-custom/client';

const CustomPrismockClient = createPrismock(CustomPrisma);

jest.setTimeout(40000);

class PrismockService extends PrismockClient {
  findLastPost() {
    return this.post.findMany({ take: 1, select: { title: true } });
  }
}

class CustomPrismockService extends CustomPrismockClient {
  findLastPost() {
    return this.post.findMany({ take: 1, select: { title: true } });
  }
}

class PrismaService extends PrismaClient {
  findLastPost() {
    return this.post.findMany({ take: 1, select: { title: true } });
  }
}

describe('client', () => {
  let prismock: PrismockService;
  let customPrismock: CustomPrismockService;
  let prisma: PrismaService;

  async function reset() {
    await resetDb();

    prisma = new PrismaService();
    prismock = new PrismockService();
    customPrismock = new CustomPrismockService();
    await simulateSeed(prismock);
    await simulateSeed(customPrismock);
  }

  beforeAll(async () => {
    await reset();
  });

  it('Should return first article from custom method', async () => {
    const expected = [{ title: 'title1' }];

    const realPosts = await prisma.findLastPost();
    const mockPosts = await prismock.findLastPost();
    const customMockPosts = await customPrismock.findLastPost();

    expect(realPosts).toEqual(expected);
    expect(mockPosts).toEqual(expected);
    expect(customMockPosts).toEqual(expected);
  });
});
