import { FindWhereFieldArg } from './Find';

export type AggregateArgs = {
  _avg?: Record<string, boolean>;
  _count?: Record<string, boolean>;
  _max?: Record<string, boolean>;
  _min?: Record<string, boolean>;
  _sum?: Record<string, boolean>;
  cursor?: Record<string, FindWhereFieldArg>;
};
