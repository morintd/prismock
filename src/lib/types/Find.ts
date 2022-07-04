import { Prisma } from '@prisma/client';

export type SelectArgs = Record<string, boolean | Record<string, boolean>>;

export type FindWhereFieldRelationArg = {
  equals?: FindWhereFieldArg;
  in?: Prisma.Enumerable<FindWhereFieldArg>;
  notIn?: Prisma.Enumerable<FindWhereFieldArg>;
  not?: FindWhereFieldRelationArg | FindWhereFieldArg;
};

export type FindWhereFieldArg =
  | Prisma.BoolFilter
  | Prisma.IntFilter
  | Prisma.StringFilter
  | Prisma.BigIntFilter
  | Prisma.FloatFilter
  | Prisma.DecimalFilter
  | Prisma.Decimal
  | Prisma.DecimalJsLike
  | Prisma.DateTimeFilter
  | Prisma.BytesNullableFilter
  | Prisma.JsonFilter
  | Buffer
  | null
  | Date
  | boolean
  | string
  | number
  | bigint
  | FindWhereFieldRelationArg
  | FindArgs;

export type FindWhereArgs = {
  AND?: Prisma.Enumerable<FindWhereArgs>;
  OR?: Prisma.Enumerable<FindWhereArgs>;
  NOT?: Prisma.Enumerable<FindWhereArgs>;
} & Record<string, FindWhereFieldArg>;

export type FindArgs = {
  select?: SelectArgs | null;
  include?: Record<string, boolean> | null;
  where?: FindWhereArgs;
  orderBy?: Prisma.Enumerable<Record<string, Prisma.SortOrder>>;
  cursor?: Record<string, unknown>;
  take?: number;
  skip?: number;
  distinct?: Prisma.Enumerable<string[]>;
};
