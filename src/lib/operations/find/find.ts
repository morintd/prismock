import { DMMF } from '@prisma/generator-helper';

import { FindArgs, GroupByFieldArg, Order, OrderedValue } from '../../types';
import { Delegate, DelegateProperties, Item } from '../../delegate';
import { camelize, pipe } from '../../helpers';
import { Delegates, RelationshipStore } from '../../prismock';

import { matchMultiple } from './match';

export function findNextIncrement(properties: DelegateProperties, fieldName: string) {
  const current = properties.increment[fieldName];
  const increment = (current ?? 0) + 1;

  Object.assign(properties.increment, { [fieldName]: increment });

  return increment;
}

export function findOne(args: FindArgs, current: Delegate, delegates: Delegates, relationshipStore?: RelationshipStore) {
  const found = pipe(
    (items: Item[]) => items.filter((item) => where(args.where, current, delegates)(item)),
    order(args, current, delegates),
    connect(args, current, delegates, relationshipStore),
    paginate(args.skip, args.take),
  )(current.getItems()).at(0);

  if (!found) return null;

  return structuredClone(select(args.select)(found));
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

export function includes(args: FindArgs, current: Delegate, delegates: Delegates, relationshipStore?: RelationshipStore) {
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

        const isTrueSelfReferencing = schema.type === current.model.name &&
          schema.relationToFields?.length === 0 &&
          schema.relationFromFields?.length === 0 &&
          schema.isList;

        if (isTrueSelfReferencing && relationshipStore) {
          const relationKey = `${schema.type}:${schema.relationName}`;
          const relationships = relationshipStore[relationKey] || [];
          
          const connectedIds = relationships
            .filter((rel: { fromId: string | number; toId: string | number }) => rel.fromId === item.id)
            .map((rel: { fromId: string | number; toId: string | number }) => rel.toId);
          
          const connectedItems = delegate.getItems().filter((delegateItem: Item) =>
            connectedIds.includes(delegateItem.id as string | number)
          );
          
          Object.assign(newItem, { [key]: connectedItems });
        } else {
          subArgs = Object.assign(Object.assign({}, subArgs), {
            where: Object.assign(
              Object.assign({}, (subArgs as any).where),
              getFieldRelationshipWhere(item, schema, delegates, relationshipStore),
            ),
          });

          if (schema.isList) {
            Object.assign(newItem, { [key]: findMany(subArgs as Record<string, boolean>, delegate, delegates, relationshipStore) });
          } else {
            Object.assign(newItem, { [key]: findOne(subArgs as any, delegate, delegates, relationshipStore) });
          }
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
  relationshipStore?: RelationshipStore,
): Record<string, GroupByFieldArg> => {
  const currentModelName = Object.values(delegates).find(d =>
    d.model.fields.some(f => f.name === field.name && f.relationName === field.relationName)
  )?.model.name;
  
  const isTrueSelfReferencing = field.type === currentModelName &&
    field.relationToFields?.length === 0 &&
    field.relationFromFields?.length === 0 &&
    field.isList;

  if (isTrueSelfReferencing) {
    if (!relationshipStore) return {};

    const relationKey = `${field.type}:${field.relationName}`;
    const relationships = relationshipStore[relationKey] || [];
    const connectedIds = relationships
      .filter((rel) => rel.fromId === item.id)
      .map((rel) => rel.toId);

    return { id: { in: connectedIds } };
  }
  
  if (field.relationToFields?.length === 0) {
    field = getJoinField(field, delegates)!;
    return {
      [field.relationFromFields![0]]: item[field.relationToFields![0]] as GroupByFieldArg,
    };
  }
  return {
    [field.relationToFields![0]]: item[field.relationFromFields![0]] as GroupByFieldArg,
  };
};

export const getFieldFromRelationshipWhere = (item: Item, field: DMMF.Field) => {
  if (!field.relationFromFields || !field.relationToFields ||
      field.relationFromFields.length === 0 || field.relationToFields.length === 0) {
    return {};
  }
  
  return {
    [field.relationFromFields[0]]: item[field.relationToFields[0]] as GroupByFieldArg,
  };
};

export const getFieldToRelationshipWhere = (item: Item, field: DMMF.Field) => {
  return {
    [field.relationToFields![0]]: item[field.relationFromFields![0]] as GroupByFieldArg,
  };
};

function connect(args: FindArgs, current: Delegate, delegates: Delegates, relationshipStore?: RelationshipStore) {
  return (items: Item[]) => {
    return items.reduce((accumulator: Item[], currentValue) => {
      const item = pipe(includes(args, current, delegates, relationshipStore), select(args.select))(currentValue);
      return [...accumulator, item];
    }, []);
  };
}

export function findMany(args: FindArgs, current: Delegate, delegates: Delegates, relationshipStore?: RelationshipStore) {
  const found = pipe(
    (items: Item[]) => items.filter((item) => where(args.where, current, delegates)(item)),
    order(args, current, delegates),
    connect(args, current, delegates, relationshipStore),
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
