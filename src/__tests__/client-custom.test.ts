import { DMMF } from '@prisma/generator-helper';

import { seededBlogs, seededPosts, seededUsers } from '../../testing';
import { generateDMMF, generatePrismock, generatePrismockSync } from '../lib/prismock';

describe('client (custom)', () => {
  describe('generatePrismock', () => {
    it('Should set/get data', async () => {
      const prismock = await generatePrismock();
      prismock.setData({ user: seededUsers, post: seededPosts, blog: seededBlogs });
      expect(prismock.getData()).toEqual({ user: seededUsers, post: seededPosts, blog: seededBlogs });
    });
  });

  describe('generatePrismockSync', () => {
    let models: DMMF.Model[];

    beforeAll(async () => {
      const schema = await generateDMMF();
      models = schema.datamodel.models;
    });

    it('Should set/get data', () => {
      const prismock = generatePrismockSync({ models });
      prismock.setData({ user: seededUsers, post: seededPosts, blog: seededBlogs });
      expect(prismock.getData()).toEqual({ user: seededUsers, post: seededPosts, blog: seededBlogs });
    });
  });
});
