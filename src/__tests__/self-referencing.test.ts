
import { PrismaClient } from '@prisma/client';
import { resetDb, simulateSeed } from '../../testing';
import { PrismockClient, PrismockClientType } from '../lib/client';

jest.setTimeout(40000);

describe('Self-referencing many-to-many', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  beforeEach(async () => {
    await resetDb();
    prismock = new PrismockClient() as PrismockClientType;
    prisma = new PrismaClient();
    await simulateSeed(prismock);
  });

  it('Should create a self-referencing relationship between posts', async () => {
    const [mockPost1, mockPost2] = await prismock.post.findMany();
    const [realPost1, realPost2] = await prisma.post.findMany();

    const updatedMockPost = await prismock.post.update({
      where: { id: mockPost1.id },
      data: {
        similarTo: {
          connect: [{ id: mockPost2.id }],
        },
      },
      include: {
        similarTo: true,
      },
    });

    const updatedRealPost = await prisma.post.update({
      where: { id: realPost1.id },
      data: {
        similarTo: {
          connect: [{ id: realPost2.id }],
        },
      },
      include: {
        similarTo: true,
      },
    });

    expect(updatedMockPost).toEqual({
      ...mockPost1,
      createdAt: expect.anything(),
      imprint: expect.any(String),
      similarTo: [{ 
        ...mockPost2, 
        createdAt: expect.anything(),
        imprint: expect.any(String)
      }],
    });
    expect(updatedRealPost).toEqual({
      ...realPost1,
      createdAt: expect.anything(),
      imprint: expect.any(String),
      similarTo: [{ 
        ...realPost2, 
        createdAt: expect.anything(),
        imprint: expect.any(String)
      }],
    });
  });
});