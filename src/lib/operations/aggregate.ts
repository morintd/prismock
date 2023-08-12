import { Item } from '../delegate';
import { AggregateArgs } from '../types';

type AggregateResult = {
  _avg?: Record<string, number>;
  _count?: Record<string, number>;
  _max?: Record<string, number>;
  _min?: Record<string, number>;
  _sum?: Record<string, number>;
};

export function aggregate(args: AggregateArgs, items: Item[]) {
  const aggregated: AggregateResult = {};

  if (args._max) aggregated._max = aggregateMax(args._max, items);
  if (args._avg) aggregated._avg = aggregateAvg(args._avg, items);
  if (args._min) aggregated._min = aggregateMin(args._min, items);
  if (args._sum) aggregated._sum = aggregateSum(args._sum, items);
  if (args._count) aggregated._count = aggregateCount(args._count, items);

  return aggregated;
}

function aggregateMax(arg: NonNullable<AggregateArgs['_max']>, items: Item[]) {
  const _max: Record<string, number> = {};

  Object.keys(arg).forEach((property) => {
    _max[property] = Math.max(...items.map((item) => item[property] as number));
  });

  return _max;
}

function aggregateAvg(arg: NonNullable<AggregateArgs['_avg']>, items: Item[]) {
  const _avg: Record<string, number> = {};

  Object.keys(arg).forEach((property) => {
    const values = items
      .filter((item) => item[property] !== undefined && item[property] !== null)
      .map((item) => item[property] as number);
    const total = values.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);

    _avg[property] = total / values.length;
  });

  return _avg;
}

function aggregateMin(arg: NonNullable<AggregateArgs['_min']>, items: Item[]) {
  const _min: Record<string, number> = {};

  Object.keys(arg).forEach((property) => {
    _min[property] = Math.min(...items.map((item) => item[property] as number));
  });

  return _min;
}

function aggregateSum(arg: NonNullable<AggregateArgs['_sum']>, items: Item[]) {
  const _sum: Record<string, number> = {};

  Object.keys(arg).forEach((property) => {
    const values = items.map((item) => item[property] as number);
    const total = values.reduce((accumulator, currentValue) => {
      return accumulator + currentValue;
    }, 0);

    _sum[property] = total;
  });

  return _sum;
}

function aggregateCount(arg: NonNullable<AggregateArgs['_max']>, items: Item[]) {
  const _count: Record<string, number> = {};

  Object.keys(arg).forEach((property) => {
    _count[property] = items.filter((item) => item[property] !== undefined && item[property] !== null).length;
  });

  return _count;
}
