import { PrismaClient } from '@prisma/client';

import { Delegate } from './delegate';
import { Data } from './prismock';

type GetData = () => Data;
type SetData = (data: Data) => void;

export type PrismockClient = PrismaClient & {
  getData: GetData;
  setData: SetData;
};

export function generateClient(delegates: Record<string, Delegate>, getData: GetData, setData: SetData) {
  return {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    getData,
    setData,
    ...delegates,
  } as PrismockClient;
}
