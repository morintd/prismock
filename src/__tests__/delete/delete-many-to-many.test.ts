import { PrismaClient } from '@prisma/client';

import { resetDb, simulateSeed, type PostWithComments } from '../../../testing';
import { PrismockClient, PrismockClientType, relationshipStore } from '../../lib/client';

describe('deleteMany', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeEach(() => relationshipStore.resetValues());

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
  });

  it('Should reset many to many relationships', async () => {
    const connectPayload = {
      where: { id: 1 },
      data: {
        comments: {
          connect: [{ id: 1 }, { id: 2 }],
        },
      },
    };

    await prisma.post.update(connectPayload);
    await prismock.post.update(connectPayload);

    await prisma.comment.delete({ where: { id: 1 } });
    await prismock.comment.delete({ where: { id: 1 } });

    await prisma.comment.create({
      data: {
        body: 'yo',
      },
    });
    await prismock.comment.create({
      data: {
        id: 1,
        body: 'yo',
      },
    });

    const post = await prisma.post.findFirst({ where: { id: 1 }, include: { comments: true } });
    const mockedPost = await prismock.post.findFirst({ where: { id: 1 }, include: { comments: true } });

    expect(post).toMatchObject(mockedPost as PostWithComments);
  });
});
