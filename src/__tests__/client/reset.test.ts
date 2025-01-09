import { simulateSeed } from '../../../testing';
import { PrismockClient, PrismockClientType } from '../../lib/client';

jest.setTimeout(40000);

describe('client (reset)', () => {
  it('Should reset data', async () => {
    const prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const users = await prismock.user.findMany();
    expect(users.length > 0).toBeTruthy();

    prismock.reset();

    const usersAfterReset = await prismock.user.findMany();
    expect(usersAfterReset.length > 0).not.toBeTruthy();
  });

  it('Should reset with previous references', async () => {
    const prismock = new PrismockClient() as PrismockClientType;
    await simulateSeed(prismock);

    const users = await prismock.user.findMany();
    expect(users.length > 0).toBeTruthy();

    const userService = prismock.user;

    prismock.reset();

    const usersAfterReset = await userService.findMany();
    expect(usersAfterReset.length > 0).not.toBeTruthy();

    const getDataUsers = prismock.getData().user;
    expect(getDataUsers.length > 0).not.toBeTruthy();
  });
});
