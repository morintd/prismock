import { seededBlogs, seededPosts, seededUsers } from '../../testing';
import { generatePrismock } from '../lib/prismock';

describe('client (custom)', () => {
  it('Should set/get data', async () => {
    const prismock = await generatePrismock();
    prismock.setData({ user: seededUsers, post: seededPosts, blog: seededBlogs });
    expect(prismock.getData()).toEqual({ user: seededUsers, post: seededPosts, blog: seededBlogs });
  });
});
