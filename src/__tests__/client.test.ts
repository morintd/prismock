import { seededPosts, seededUsers } from '../../testing';
import { generatePrismock } from '../lib/prismock';

describe('client', () => {
  it('Should connect', async () => {
    const prismock = await generatePrismock();
    return expect(prismock.$connect()).resolves.not.toThrow();
  });

  it('Should set/get data', async () => {
    const prismock = await generatePrismock();
    prismock.setData({ user: seededUsers, post: seededPosts });
    expect(prismock.getData()).toEqual({ user: seededUsers, post: seededPosts });
  });
});
