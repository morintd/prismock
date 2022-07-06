import { Item } from '../delegate';

import { FindWhereArgs, SelectArgs } from './Find';

export type UpsertArgs = {
  select?: SelectArgs | null;
  include?: Record<string, boolean> | null;
  where: FindWhereArgs;
  create: Item;
  update: Item;
};
