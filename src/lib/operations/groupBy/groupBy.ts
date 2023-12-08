import { Delegate, Item } from '../../delegate';
import { ensureArray, pick, shallowCompare, unique } from '../../helpers';
import { Delegates } from '../../prismock';
import { AggregateArgs, GroupByArgs, GroupByHavingInput, OrderedValue } from '../../types';
import { aggregate } from '../aggregate';
import { calculateOrder, findMany } from '../find';
import { matchMultiple } from '../find/match';

export function groupBy(args: GroupByArgs, current: Delegate, delegates: Delegates) {
  const by = Array.isArray(args.by) ? args.by : [args.by];
  const items = findMany({ where: args.where }, current, delegates);
  const grouped = divideIntoGroups(args, by, items);
  const filtered = having(grouped, args.having, current, delegates);

  const ordered = orderWithAggregates(filtered, args, current, delegates);

  return ordered.map((group) => extractDesiredFields(args, group));
}

function having(items: ItemGroup[], arg: GroupByArgs['having'], current: Delegate, delegates: Delegates) {
  if (arg === undefined) {
    return items;
  }
  const flattenedArg = flattenHaving(arg);
  return items.filter(({ havingValue }) => {
    const result = matchMultiple(havingValue, flattenedArg, current, delegates);
    return result;
  });
}

function flattenHaving(having: GroupByHavingInput): Record<string, any> {
  return Object.fromEntries(
    Object.entries(having).flatMap(([key, value]) => {
      if (['AND', 'OR', 'NOT'].includes(key)) {
        return [[key, ensureArray(value).map((v) => flattenHaving(v))]];
      }
      if (typeof value === 'object') {
        const hasAgg = Object.keys(value).some((k) => k.startsWith('_'));
        if (!hasAgg) {
          return [[key, value]];
        }
        return Object.entries(value).map(([nestedKey, nestedValue]) => {
          return [key + nestedKey, nestedValue];
        });
      }
      return [[key, value]];
    }),
  );
}

function orderWithAggregates(groups: ItemGroup[], args: GroupByArgs, delegate: Delegate, delegates: Delegates) {
  if (!args.orderBy) return groups;
  const propertiesToOrderBy = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy as Record<string, OrderedValue>];

  const o = propertiesToOrderBy.reduceRight((accumulator, currentValue) => {
    const acc = accumulator.sort((a, b) =>
      calculateOrder(a.orderByValue, b.orderByValue, currentValue, delegate, delegates),
    );
    return acc;
  }, groups);
  return o;
}

function extractDesiredFields(args: GroupByArgs, { groupKey, items }: ItemGroup) {
  return {
    ...groupKey,
    ...aggregate({ ...args, cursor: undefined }, items),
  };
}

type ItemGroup = { groupKey: Item; items: Item[]; orderByValue: Item; havingValue: Item };

function divideIntoGroups(args: GroupByArgs, by: string[], items: Item[]): ItemGroup[] {
  return items
    .reduce((groups, item) => {
      const itemKey = pick(item, by);
      let group = groups.find(([groupKey]) => shallowCompare(groupKey, itemKey));
      if (!group) {
        group = [itemKey, [item]];
        groups.push(group);
      } else {
        group[1].push(item);
      }
      return groups;
    }, [] as [groupKey: Item, items: Item[]][])
    .map(([groupKey, items]) => {
      return {
        groupKey,
        items,
        orderByValue: buildOrderByValue(args, groupKey, items),
        havingValue: buildHavingValue(args, groupKey, items),
      };
    });
}

type AggregateKey = Extract<keyof AggregateArgs, `_${string}`>;

function buildOrderByValue(args: GroupByArgs, groupKey: Item, items: Item[]): Item {
  if (args.orderBy === undefined) {
    return {};
  }
  const aggregateArgs = ensureArray(args.orderBy).reduce(
    (agg, each) =>
      (Object.entries(each).filter(([key]) => key.startsWith('_')) as [AggregateKey, Record<string, any>][]).reduce(
        (agg, [aggregation, fields]) => {
          return Object.assign(agg, mergeAggregateArg(aggregation, agg[aggregation], fields));
        },
        agg,
      ),
    {} as Record<AggregateKey, Record<string, boolean>>,
  );
  return {
    ...groupKey,
    ...aggregate(aggregateArgs, items),
  };
}

function extractDesiredHavingAggregates(
  having: GroupByHavingInput,
  result: Partial<Record<AggregateKey, string[]>> = {},
): Partial<Record<AggregateKey, string[]>> {
  return Object.entries(having).reduce((agg, [field, value]) => {
    if (['AND', 'OR', 'NOT'].includes(field)) {
      return ensureArray(value).reduce((a, each) => extractDesiredHavingAggregates(each, a), agg);
    } else {
      Object.keys(value)
        .filter((k) => k.startsWith('_'))
        .forEach((aggregation) => {
          const aggKey = aggregation as AggregateKey;
          agg[aggKey] = (agg[aggKey] ?? []).concat([field]);
        });
      return agg;
    }
  }, result);
}

function buildHavingValue(args: GroupByArgs, groupKey: Item, items: Item[]) {
  if (args.having === undefined) {
    return {};
  }
  const desiredAggregates = extractDesiredHavingAggregates(args.having);
  const aggregateArgs: AggregateArgs = Object.fromEntries(
    Object.entries(desiredAggregates).map(([field, aggregates]) => [
      field,
      Object.fromEntries(unique(aggregates).map((agg) => [agg, true])),
    ]),
  );

  return {
    ...groupKey,
    ...flattenAggregate(aggregate(aggregateArgs, items)),
  };
}

function flattenAggregate(aggregate: Partial<Record<AggregateKey, any>>) {
  const result: Record<string, any> = {};
  Object.entries(aggregate).forEach(([aggregate, fields]) => {
    Object.entries(fields).forEach(([field, value]) => {
      result[field + aggregate] = value;
    });
  });
  return result;
}

function mergeAggregateArg(
  aggregation: AggregateKey,
  aggregate: Record<string, boolean> | undefined,
  value: Record<string, any>,
): Partial<Record<AggregateKey, Record<string, boolean>>> {
  const valueToProcess: Record<string, any> = aggregate
    ? Object.keys(value).reduce((agg, key) => Object.assign(agg, { [key]: true }), aggregate)
    : value;
  return {
    [aggregation]: Object.fromEntries(Object.keys(valueToProcess).map((k) => [k, true])),
  };
}
