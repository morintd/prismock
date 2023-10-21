import { DMMF } from '@prisma/generator-helper';

import { seededUsers } from '../../../testing';
import { generateDMMF, generatePrismockSync } from '../../lib/prismock';
import { PrismockClient, PrismockClientType } from '../../lib/client';

describe('client (custom)', () => {
  describe('generatePrismock', () => {
    it('Should get data', async () => {
      const prismock = new PrismockClient() as PrismockClientType;
      await prismock.user.createMany({ data: seededUsers.map(({ id, ...user }) => ({ ...user, parameters: {} })) });

      const data = prismock.getData();

      expect({
        ...data,
        user: data.user.map(({ id, ...user }) => user),
      }).toEqual({ user: seededUsers.map(({ id, ...user }) => user), blog: [], post: [], profile: [] });
    });
  });

  describe('generatePrismockSync', () => {
    let models: DMMF.Model[];

    beforeAll(async () => {
      const schema = await generateDMMF();
      models = schema.datamodel.models;
    });

    it('Should get data', async () => {
      const prismock = generatePrismockSync({ models });
      await prismock.user.createMany({ data: seededUsers.map(({ id, ...user }) => ({ ...user, parameters: {} })) });

      const data = prismock.getData();

      expect({
        ...data,
        user: data.user.map(({ id, ...user }) => user),
      }).toEqual({ user: seededUsers.map(({ id, ...user }) => user), blog: [], post: [], profile: [] });
    });
  });
});
