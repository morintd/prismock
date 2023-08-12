import { DMMF } from '@prisma/generator-helper';

import { FindArgs, FindWhereFieldArg, Order, OrderedValue } from '../../types';
import { Delegate, DelegateProperties, Item } from '../../delegate';
import { camelize } from '../../helpers';
import { Delegates } from '../../prismock';

import { matchMultiple } from './match';

export function findNextIncrement(properties: DelegateProperties, fieldName: string) {
  const current = properties.increment[fieldName];
  const increment = (current ?? 0) + 1;

  Object.assign(properties.increment, { [fieldName]: increment });

  return increment;
}

export function findOne(args: FindArgs, current: Delegate, delegates: Delegates) {
  const found = current.getItems().find(where(args.where, current, delegates));
  if (!found) return null;

  const withIncludes = includes(args, current, delegates)(found);
  const withSelect = select(withIncludes, args.select);

  return withSelect;
}

export function where(whereArgs: FindArgs['where'] = {}, current: Delegate, delegates: Delegates) {
  return (item: Record<string, unknown>) => matchMultiple(item, whereArgs, current, delegates);
}

function getOrderedValue(orderedValue: OrderedValue) {
  if (typeof orderedValue === 'object') {
    return {
      sortOrder: orderedValue.sort,
      nullOrder: orderedValue.nulls ?? 'last',
    };
  }

  return {
    sortOrder: orderedValue,
    nullOrder: 'last',
  };
}

function isOrderByRelation(orderedProperties: Record<string, OrderedValue>) {
  const orderedProperty = Object.keys(orderedProperties)[0];
  return Object.keys(orderedProperties[orderedProperty]).includes('_count');
}
/*
 * It seems like there are some weird and unintuitive rules when it comes to orderBy
 * I tried my best to replicate them here, and it seems like they correspond to the real rules.
 * @TODO: probably refactor that part
 */
export function calculateOrder(
  a: Item,
  b: Item,
  orderedProperties: Record<string, OrderedValue>,
  isSorted: boolean,
  current: Delegate,
  delegates: Delegates,
) {
  for (const orderedProperty in orderedProperties) {
    if (isOrderByRelation(orderedProperties)) {
      const sortOrder = Object.values(orderedProperties[orderedProperty])[0];
      return calculateRelationOrder(a, b, orderedProperty, sortOrder, current, delegates);
    }

    const { nullOrder, sortOrder } = getOrderedValue(orderedProperties[orderedProperty]);

    let weight = 0;
    const weightMultiplier = sortOrder === 'desc' ? -1 : 1;

    const values = [a[orderedProperty], b[orderedProperty]];

    if (values.every((value) => value === null)) {
      if (!isSorted && nullOrder === 'last' && sortOrder === 'asc') return -1;
      if (isSorted && nullOrder === 'last' && sortOrder === 'asc') return 1;
    } else if (values.some((value) => value === null)) {
      if (nullOrder === 'first' || (nullOrder === 'last' && sortOrder === 'desc')) weight = -1;
      else weight = 1;

      if (values[0] === null) return weight;
      if (values[1] === null) return weight * -1;
    }

    if (typeof values[0] === 'number' && typeof values[1] === 'number') {
      weight = values[0] - values[1];
      if (weight === 0 && sortOrder === 'desc') return weightMultiplier * -1;
    }

    if (typeof values[0] === 'string' && typeof values[1] === 'string') {
      weight = values[0].localeCompare(values[1]);
    }

    if (weight !== 0) return weight * weightMultiplier;
  }

  return 0;
}

export function calculateRelationOrder(
  a: Item,
  b: Item,
  orderedProperty: string,
  sortOrder: Order,
  current: Delegate,
  delegates: Delegates,
) {
  const schema = current.model.fields.find((field) => field.name === orderedProperty);
  if (!schema?.relationName) return 0;

  const delegateName = camelize(schema.type);
  const delegate = delegates[delegateName];

  const field = getJoinField(schema, delegates)!;

  const counts = {
    a: findMany(
      {
        where: {
          [field.relationFromFields![0]]: a[field.relationToFields![0]] as FindWhereFieldArg,
        },
      },
      delegate,
      delegates,
    ).length,
    b: findMany(
      {
        where: {
          [field.relationFromFields![0]]: b[field.relationToFields![0]] as FindWhereFieldArg,
        },
      },
      delegate,
      delegates,
    ).length,
  };

  const weightMultiplier = sortOrder === 'desc' ? -1 : 1;
  const weight = counts.a - counts.b;
  if (weight === 0 && sortOrder === 'desc') return weightMultiplier * -1;
  if (weight === 0 && sortOrder === 'asc') return weightMultiplier;

  if (weight !== 0) return weight * weightMultiplier;

  return 0;
}

export function order(items: Item[], args: FindArgs, delegate: Delegate, delegates: Delegates) {
  if (!args.orderBy) return items;
  const propertiesToOrderBy = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy as Record<string, OrderedValue>];

  const baseItems = propertiesToOrderBy.length === 1 && isOrderByRelation(propertiesToOrderBy[0]) ? items : items.reverse();

  const o = propertiesToOrderBy.reduceRight((accumulator, currentValue, i) => {
    const acc = accumulator.sort((a, b) =>
      calculateOrder(a, b, currentValue, i < propertiesToOrderBy.length - 1, delegate, delegates),
    );
    return acc;
  }, baseItems);
  return o;
}

export function paginate(items: Item[], skip?: number, take?: number) {
  if (!skip && !take) return items;
  return items.slice(skip ?? 0, take === undefined ? undefined : take + (skip ?? 0));
}

export function includes(args: FindArgs, current: Delegate, delegates: Delegates) {
  return (item: Item) => {
    if ((!args?.include && !args?.select) || !item) return item;
    let newItem = item;
    const obj = args?.select ?? args.include!;

    Object.keys(obj).forEach((key) => {
      const schema = current.model.fields.find((field) => field.name === key);
      if (!schema?.relationName) return;

      const delegateName = camelize(schema.type);
      const delegate = delegates[delegateName];

      let subArgs = obj[key] === true ? {} : obj[key];

      subArgs = Object.assign(Object.assign({}, subArgs), {
        where: Object.assign(Object.assign({}, (subArgs as any).where), getFieldRelationshipWhere(item, schema, delegates)),
      });

      if (schema.isList) {
        newItem = Object.assign(Object.assign({}, newItem), {
          [key]: findMany(subArgs as Record<string, boolean>, delegate, delegates),
        });
      } else {
        newItem = Object.assign(Object.assign({}, newItem), { [key]: findOne(subArgs as any, delegate, delegates) });
      }
    });

    return newItem;
  };
}

export function select(item: Item, selectArgs: FindArgs['select']) {
  if (!selectArgs) return item;
  return Object.entries(item).reduce((accumulator: Record<string, unknown>, [key, value]) => {
    if (selectArgs[key]) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {} as Item);
}

export const getJoinField = (field: DMMF.Field, delegates: Delegates) => {
  const joinDelegate = Object.values(delegates).find((delegate) => {
    return delegate.model.name === field.type;
  });

  const joinfield = joinDelegate?.model.fields.find((f) => {
    return f.relationName === field.relationName;
  });

  return joinfield;
};

export const getFieldRelationshipWhere = (
  item: Item,
  field: DMMF.Field,
  delegates: Delegates,
): Record<string, FindWhereFieldArg> => {
  if (field.relationToFields?.length === 0) {
    field = getJoinField(field, delegates)!;
    return {
      [field.relationFromFields![0]]: item[field.relationToFields![0]] as FindWhereFieldArg,
    };
  }
  return {
    [field.relationToFields![0]]: item[field.relationFromFields![0]] as FindWhereFieldArg,
  };
};

export function findMany(args: FindArgs, current: Delegate, delegates: Delegates) {
  const withWhere = current.getItems().filter((item) => where(args.where, current, delegates)(item));
  const withOrder = order(withWhere, args, current, delegates);

  const items = withOrder.reduce((accumulator: Item[], currentValue) => {
    const withIncludes = includes(args, current, delegates)(currentValue);
    const withSelect = select(withIncludes, args.select);
    accumulator.push(withSelect);
    return accumulator;
  }, []);

  const found = paginate(items, args.skip, args.take);

  if (args?.distinct) {
    const values: Record<string, unknown[]> = {};
    return found.filter((item) => {
      let shouldInclude = true;
      args.distinct!.forEach((key) => {
        const vals: Array<unknown> = values[key as string] || [];
        if (vals.includes(item[key as string])) {
          shouldInclude = false;
        } else {
          vals.push(item[key as string]);
          values[key as string] = vals;
        }
      });
      return shouldInclude;
    });
  }

  return found;
}
