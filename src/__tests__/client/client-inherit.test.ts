import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed } from '../../../testing';
import { PrismockClient } from '../../lib/client';

jest.setTimeout(40000);

class PrismockService extends PrismockClient {
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
  let prisma: PrismaService;

  async function reset() {
    await resetDb();

    prisma = new PrismaService();
    prismock = new PrismockService();
    await simulateSeed(prismock);
  }

  beforeAll(async () => {
    await reset();
  });

  it('Should return first article from custom method', async () => {
    const expected = [{ title: 'title1' }];

    const realPosts = await prisma.findLastPost();
    const mockPosts = await prismock.findLastPost();

    expect(realPosts).toEqual(expected);
    expect(mockPosts).toEqual(expected);
  });
});
