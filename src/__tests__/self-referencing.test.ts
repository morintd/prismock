import { resetDb, simulateSeed } from '../../testing';
import { PrismockClient, PrismockClientType } from '../lib/client';

jest.setTimeout(40000);

describe('Self-referencing many-to-many', () => {
  let prismock: PrismockClientType;

  beforeAll(async () => {
    await resetDb();
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
  });

  it('Should create a self-referencing relationship between posts', async () => {
    const initialPost = await prismock.post.create({
      data: {
        title: 'Initial Post',
        authorId: 1,
        blogId: 1,
      },
    });

    const nextPost = await prismock.post.create({
      data: {
        title: 'Next Post',
        authorId: 1,
        blogId: 1,
      },
    });

    await prismock.post.update({
      where: { id: initialPost.id },
      data: {
        nextPosts: {
          connect: [{ id: nextPost.id }],
        },
      },
    });

    const updatedInitialPost = await prismock.post.findUnique({
      where: { id: initialPost.id },
      include: { nextPosts: true },
    });

    const updatedNextPost = await prismock.post.findUnique({
      where: { id: nextPost.id },
      include: { prevPosts: true },
    });

    expect(updatedInitialPost?.nextPosts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: nextPost.id })]),
    );
    expect(updatedNextPost?.prevPosts).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: initialPost.id })]),
    );
  });
});