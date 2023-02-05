import { PrismaClient } from '@prisma/client';

import { Delegate } from './delegate';
import { Data } from './prismock';

type GetData = () => Data;
type SetData = (data: Data) => void;

export type PrismockClient = PrismaClient & {
  getData: GetData;
  setData: SetData;
};

type TransactionArgs = (tx: Omit<PrismaClient, '$transaction'>) => unknown | Promise<unknown>[];

export function generateClient(delegates: Record<string, Delegate>, getData: GetData, setData: SetData) {
  const client = {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $on: () => {},
    $use: () => {},
    $executeRaw: () => Promise.resolve(0),
    $executeRawUnsafe: () => Promise.resolve(0),
    $queryRaw: () => Promise.resolve([]),
    $queryRawUnsafe: () => Promise.resolve([]),
    getData,
    setData,
    ...delegates,
  } as unknown as PrismockClient;

  return {
    ...client,
    $transaction: async (args: TransactionArgs) => {
      if (Array.isArray(args)) {
        return Promise.all(args);
      }

      return args(client);
    },
  } as unknown as PrismockClient;
}
