import { DMMF } from '@prisma/generator-helper';

import { FindArgs, FindWhereArgs, GroupByFieldArg, Order, OrderedValue } from '../../types';
import { Delegate, DelegateProperties, Item } from '../../delegate';
import { camelize, pipe } from '../../helpers';
import { Delegates } from '../../prismock';
import { relationshipStore } from '../../client';

import { matchMultiple } from './match';

export function findNextIncrement(properties: DelegateProperties, fieldName: string) {
  const current = properties.increment[fieldName];
  const increment = (current ?? 0) + 1;

  Object.assign(properties.increment, { [fieldName]: increment });

  return increment;
}

export function findOne(args: FindArgs, current: Delegate, delegates: Delegates) {
  const found = pipe(
    (items: Item[]) => items.filter((item) => where(args.where, current, delegates)(item)),
    order(args, current, delegates),
    connect(args, current, delegates),
    paginate(args.skip, args.take),
  )(current.getItems()).at(0);

  if (!found) return null;

  return structuredClone(select(args.select)(found));
}

export function where(whereArgs: FindArgs['where'] = {}, current: Delegate, delegates: Delegates) {
  return (item: Record<string, unknown>) => {
    const res = matchMultiple(item, whereArgs, current, delegates);
    return res;
  };
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

export function calculateOrder(
  a: Item,
  b: Item,
  orderedProperties: Record<string, OrderedValue>,
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
      return 0;
    } else if (values.some((value) => value === null)) {
      if (values[0] === null) weight = -1;
      if (values[1] === null) weight = 1;

      if (nullOrder === 'last') return weight * -1;
      else return weight;
    }

    if (typeof values[0] === 'number' && typeof values[1] === 'number') {
      weight = values[0] - values[1];
    }

    if (typeof values[0] === 'string' && typeof values[1] === 'string') {
      weight = values[0].localeCompare(values[1]);
    }

    if (values[0] instanceof Date && values[1] instanceof Date) {
      weight = values[0].getTime() - values[1].getTime();
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

  const delegate = getDelegateFromField(schema, delegates);
  const field = getJoinField(schema, delegates)!;

  const counts = {
    a: findMany(
      {
        where: getFieldFromRelationshipWhere(a, field),
      },
      delegate,
      delegates,
    ).length,
    b: findMany(
      {
        where: getFieldFromRelationshipWhere(b, field),
      },
      delegate,
      delegates,
    ).length,
  };

  const weightMultiplier = sortOrder === 'desc' ? -1 : 1;
  const weight = counts.a - counts.b;

  if (weight !== 0) return weight * weightMultiplier;

  return 0;
}

export function order(args: FindArgs, delegate: Delegate, delegates: Delegates) {
  return (items: Item[]) => {
    if (!args.orderBy) return items;
    const propertiesToOrderBy = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy as Record<string, OrderedValue>];

    const o = propertiesToOrderBy.reduceRight((accumulator, currentValue) => {
      const acc = accumulator.sort((a, b) => calculateOrder(a, b, currentValue, delegate, delegates));
      return acc;
    }, items);
    return o;
  };
}

export function paginate(skip?: number, take?: number) {
  return (items: Item[]) => {
    if (!skip && !take) return items;
    return items.slice(skip ?? 0, take === undefined ? undefined : take + (skip ?? 0));
  };
}

export function includes(args: FindArgs, current: Delegate, delegates: Delegates) {
  return (item: Item) => {
    if ((!args?.include && !args?.select) || !item) return item;
    const newItem = { ...item };
    const obj = args?.select ?? args.include!;

    Object.keys(obj)
      .filter((key) => !!obj[key])
      .forEach((key) => {
        const schema = current.model.fields.find((field) => field.name === key);
        if (!schema?.relationName) return;

        const delegate = getDelegateFromField(schema, delegates);

        let subArgs = obj[key] === true ? {} : obj[key];

        const relation = relationshipStore.findRelationship(schema.relationName);
        if (relation) {
          subArgs = Object.assign(Object.assign({}, subArgs), {
            where: Object.assign(Object.assign({}, (subArgs as any).where), {
              id: {
                in: relationshipStore.getRelationshipIds(
                  schema.relationName,
                  schema.type,
                  (args.where?.id as FindWhereArgs) || item.id,
                ),
              },
            }),
          });
        } else {
          const fieldRelationshipWhere = getFieldRelationshipWhere(item, schema, delegates);
          subArgs = Object.assign(Object.assign({}, subArgs), {
            where: Object.assign(Object.assign({}, (subArgs as any).where), fieldRelationshipWhere),
          });
        }
        if (schema.isList) {
          Object.assign(newItem, { [key]: findMany(subArgs as Record<string, boolean>, delegate, delegates) });
        } else {
          Object.assign(newItem, { [key]: findOne(subArgs as any, delegate, delegates) });
        }
      });

    return newItem;
  };
}

export function select(selectArgs: FindArgs['select']) {
  return (item: Item) => {
    if (!selectArgs) return item;
    return Object.entries(item).reduce((accumulator: Record<string, unknown>, [key, value]) => {
      if (selectArgs[key]) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {} as Item);
  };
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

export const getDelegateFromField = (field: DMMF.Field, delegates: Delegates) => {
  const delegateName = camelize(field.type);
  return delegates[delegateName];
};

export const getFieldRelationshipWhere = (
  item: Item,
  field: DMMF.Field,
  delegates: Delegates,
): Record<string, GroupByFieldArg> => {
  if (field.relationToFields?.length === 0) {
    const joinField = getJoinField(field, delegates)!;
    return {
      [joinField.relationFromFields![0]]: item[joinField.relationToFields![0]] as GroupByFieldArg,
    };
  }
  return {
    [field.relationToFields![0]]: item[field.relationFromFields![0]] as GroupByFieldArg,
  };
};

export const getFieldFromRelationshipWhere = (item: Item, field: DMMF.Field) => {
  return {
    [field.relationFromFields![0]]: item[field.relationToFields![0]] as GroupByFieldArg,
  };
};

export const getFieldToRelationshipWhere = (item: Item, field: DMMF.Field) => {
  return {
    [field.relationToFields![0]]: item[field.relationFromFields![0]] as GroupByFieldArg,
  };
};

function connect(args: FindArgs, current: Delegate, delegates: Delegates) {
  return (items: Item[]) => {
    return items.reduce((accumulator: Item[], currentValue) => {
      const item = pipe(includes(args, current, delegates), select(args.select))(currentValue);
      return [...accumulator, item];
    }, []);
  };
}

export function findMany(args: FindArgs, current: Delegate, delegates: Delegates) {
  const found = pipe(
    (items: Item[]) => items.filter((item) => where(args.where, current, delegates)(item)),
    order(args, current, delegates),
    connect(args, current, delegates),
    paginate(args.skip, args.take),
  )(current.getItems());

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

  return structuredClone(found);
}
