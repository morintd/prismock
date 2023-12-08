import { Prisma } from '@prisma/client';

import { FindWhereArgs } from './Find';

export type GroupByArgs = {
  by: string | string[];
  where?: FindWhereArgs;
  orderBy?: Prisma.Enumerable<GroupByOrderBy>;
  having?: GroupByHavingInput;

  cursor?: Record<string, unknown>;
  take?: number;
  skip?: number;

  _count?: Record<string, boolean>;
  _avg?: Record<string, boolean>;
  _max?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _sum?: Record<string, boolean>;
};

export type GroupByOrderBy = Record<string, Prisma.SortOrder> & {
  _count?: Record<string, Prisma.SortOrder>;
  _avg?: Record<string, Prisma.SortOrder>;
  _max?: Record<string, Prisma.SortOrder>;
  _min?: Record<string, Prisma.SortOrder>;
  _sum?: Record<string, Prisma.SortOrder>;
};

export type GroupByHavingInput = {
  AND?: Prisma.Enumerable<GroupByHavingInput>;
  OR?: Prisma.Enumerable<GroupByHavingInput>;
  NOT?: Prisma.Enumerable<GroupByHavingInput>;
} & Record<string, any>;

export type GroupByFieldRelationArgWithAggrates = GroupByFieldRelationArg & {
  _count?: GroupByFieldRelationArg;
  _avg?: GroupByFieldRelationArg;
  _sum?: GroupByFieldRelationArg;
  _min?: GroupByFieldRelationArg;
  _max?: GroupByFieldRelationArg;
};

export type GroupByFieldRelationArg = {
  equals?: GroupByFieldArg;
  in?: Prisma.Enumerable<GroupByFieldArg>;
  notIn?: Prisma.Enumerable<GroupByFieldArg>;
  not?: GroupByFieldRelationArg | GroupByFieldArg;
};

export type GroupByFieldArg = Buffer | null | Date | boolean | string | number | bigint | GroupByFieldRelationArg;
