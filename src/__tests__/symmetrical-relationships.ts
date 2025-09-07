import { PrismaClient, User } from '@prisma/client';

import { resetDb, simulateSeed } from '../../testing';
import { PrismockClient, PrismockClientType, relationshipStore } from '../lib/client';

jest.setTimeout(40000);

describe('create (connect)', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeEach(() => relationshipStore.resetValues());

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
  });

  async function addConnection(client: PrismaClient, firstId: number, secondId: number) {
    await client.user.update({
      where: { id: firstId },
      data: {
        connections: {
          connect: [{ id: secondId }],
        },
      },
    });
    await client.user.update({
      where: { id: secondId },
      data: {
        connections: {
          connect: [{ id: firstId }],
        },
      },
    });
  }

  async function removeConnection(client: PrismaClient, firstId: number, secondId: number) {
    await client.user.update({
      where: { id: firstId },
      data: {
        connections: {
          disconnect: [{ id: secondId }],
        },
      },
    });
    await client.user.update({
      where: { id: secondId },
      data: {
        connections: {
          disconnect: [{ id: firstId }],
        },
      },
    });
  }

  it('Should connect many to many relationship', async () => {
    await addConnection(prisma, 1, 2);
    await addConnection(prismock, 1, 2);

    await Promise.all(
      [1, 2, 3].map(async (id) => {
        const realUser = await prisma.user.findFirst({ where: { id }, include: { connections: true } });
        const fakeUser = await prismock.user.findFirst({ where: { id }, include: { connections: true } });
        expect(realUser).toMatchObject(fakeUser as User);
      }),
    );
  });

  it('Should disconnect many to many relationship', async () => {
    await addConnection(prisma, 1, 2);
    await addConnection(prismock, 1, 2);
    await addConnection(prisma, 1, 3);
    await addConnection(prismock, 1, 3);

    await Promise.all(
      [1, 2, 3].map(async (id) => {
        const realUser = await prisma.user.findFirst({ where: { id }, include: { connections: true } });
        const fakeUser = await prismock.user.findFirst({ where: { id }, include: { connections: true } });
        expect(realUser).toMatchObject(fakeUser as User);
      }),
    );

    await removeConnection(prisma, 1, 3);
    await removeConnection(prismock, 1, 3);

    await Promise.all(
      [1, 2, 3].map(async (id) => {
        const realUser = await prisma.user.findFirst({ where: { id }, include: { connections: true } });
        const fakeUser = await prismock.user.findFirst({ where: { id }, include: { connections: true } });
        expect(realUser).toMatchObject(fakeUser as User);
      }),
    );
  });
});
