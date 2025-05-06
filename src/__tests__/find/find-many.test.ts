/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable jest/no-conditional-expect */
// @ts-nocheck
import { PrismaClient, User } from '@prisma/client';

import { resetDb, seededUsers, simulateSeed, seededBlogs, seededServices, seededReactions } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';
import { fetchGenerator, getProvider } from '../../lib/prismock';

jest.setTimeout(40000);

describe('find', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let realUser: User;
  let mockUser: User;

  let provider: string;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const generator = await fetchGenerator();
    provider = getProvider(generator)!;
    generator.stop();
  });

  describe('findMany', () => {
    it('Should find the single item matching the composite primary key', async () => {
      const expected = seededServices[0];
      const realServices = (await prisma.service.findMany({
        where: { name: { equals: expected.name }, userId: { equals: expected.userId } },
      }))!;
      const mockServices = (await prismock.service.findMany({
        where: { name: { equals: expected.name }, userId: { equals: expected.userId } },
      }))!;

      expect(realServices.length).toEqual(1);
      expect(realServices[0]).toEqual(expected);
      expect(mockServices).toEqual(realServices);
    });
  });
});
