import { Item } from '../delegate';

import { FindWhereArgs, SelectArgs } from './find';

export type UpsertArgs = {
  select?: SelectArgs | null;
  include?: Record<string, boolean> | null;
  where: FindWhereArgs;
  create: Item;
  update: Item;
};
