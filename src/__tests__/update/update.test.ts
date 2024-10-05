/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { PrismaClient, Service } from '@prisma/client';
import { version as clientVersion } from '@prisma/client/package.json';

import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { buildUser, formatEntries, formatEntry, resetDb, seededServices, seededUsers, simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';
import { Item } from '../../lib/delegate';
import { fetchGenerator, getProvider } from '../../lib/prismock';

jest.setTimeout(40000);

describe('update', () => {
  let prismock: PrismockClientType;
  let prisma: PrismaClient;

  let provider: string;

  beforeAll(async () => {
    await resetDb();

    prisma = new PrismaClient();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const generator = await fetchGenerator();
    provider = getProvider(generator);
    generator.stop();
  });

  describe('Update', () => {
    let realUpdate: Item;
    let mockUpdate: Item;

    beforeAll(async () => {
      realUpdate = await prisma.user.update({
        where: { email: seededUsers[0].email },
        data: { warnings: 99, email: undefined },
      });
      mockUpdate = await prismock.user.update({
        where: { email: seededUsers[0].email },
        data: { warnings: 99, email: undefined },
      });
    });

    it('Should return updated item', () => {
      const expected = buildUser(1, { warnings: 99 });

      expect(formatEntry(realUpdate)).toEqual(formatEntry(expected));
      expect(formatEntry(mockUpdate)).toEqual(formatEntry(expected));
    });

    it('Should update stored data', async () => {
      const expectedStore = [buildUser(1, { warnings: 99 }), seededUsers[1], seededUsers[2]];
      const mockStored = prismock.getData().user;
      const stored = (await prisma.user.findMany()).sort((a, b) => a.id.toString().localeCompare(b.id.toString()));

      expect(formatEntries(stored)).toEqual(formatEntries(expectedStore));
      expect(formatEntries(mockStored)).toEqual(formatEntries(expectedStore));
    });
  });

  describe('Update (not found)', () => {
    it("Should raise Error if doesn't exist", async () => {
      await expect(() => prisma.user.update({ where: { email: 'foo@bar.com' }, data: { warnings: 0 } })).rejects.toThrow();
      await expect(() => prismock.user.update({ where: { email: 'foo@bar.com' }, data: { warnings: 0 } })).rejects.toEqual(
        new PrismaClientKnownRequestError('No User found', {
          code: 'P2025',
          clientVersion,
          meta: {
            cause: 'Record to update not found.',
            modelName: 'User',
          },
        }),
      );
    });
  });

  describe('Update (push)', () => {
    if (['mongodb', 'postgresql'].includes(provider)) {
      let realService: Service;
      let mockService: Service;

      beforeAll(async () => {
        const seededService = seededServices[0];

        realService = (await prisma.service.findFirst({ where: { name: seededService.name } }))!;
        mockService = (await prismock.service.findFirst({ where: { name: seededService.name } }))!;

        await prisma.service.updateMany({
          where: { name: seededService.name },
          data: {
            tags: {
              push: ['tag1', 'tag2'],
            },
          },
        });
        prismock.service.updateMany({
          where: { name: seededService.name },
          data: {
            tags: {
              push: ['tag1', 'tag2'],
            },
          },
        });
      });

      it('Should update stored data', async () => {
        const mockStored = await prismock.service.findMany({ select: { name: true, tags: true, userId: true } });
        const stored = await prisma.service.findMany({ select: { name: true, tags: true, userId: true } });

        expect(stored).toEqual([
          {
            name: realService.name,
            tags: ['tag1', 'tag2'],
            userId: realService.userId,
          },
        ]);

        expect(mockStored).toEqual([
          {
            name: mockService.name,
            tags: ['tag1', 'tag2'],
            userId: mockService.userId,
          },
        ]);
      });
    }
  });
});
