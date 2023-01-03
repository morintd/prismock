import { Item } from '../delegate';

import { FindWhereArgs, SelectArgs } from './Find';

export type CreateArgs = {
  data: Item;
  include?: Record<string, boolean> | null;
  select?: SelectArgs | null;
};

export type CreateManyArgs = {
  data: Item[];
  include?: Record<string, boolean> | null;
  select?: SelectArgs | null;
};

export type ConnectOrCreate = {
  create: Item;
  where: FindWhereArgs;
};
