import { simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('client (reset)', () => {
  let prismock: PrismockClientType;

  beforeAll(async () => {
    prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);
  });

  it('Should reset data', async () => {
    const users = await prismock.user.findMany();
    expect(users.length > 0).toBeTruthy();

    prismock.reset();

    const usersAfterReset = await prismock.user.findMany();
    expect(usersAfterReset.length > 0).not.toBeTruthy();
  });
});
