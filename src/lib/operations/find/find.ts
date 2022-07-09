import { DMMF } from '@prisma/generator-helper';

import { FindArgs, FindWhereFieldArg } from '../../types';
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

export function paginate(items: Item[], skip?: number, take?: number) {
  if (!skip && !take) return items;
  return items.slice(skip ?? 0, take);
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
  const found = paginate(
    current.getItems().reduce((accumulator: Item[], currentValue) => {
      const satisfyWhere = where(args.where, current, delegates)(currentValue);
      if (satisfyWhere) {
        const withIncludes = includes(args, current, delegates)(currentValue);
        const withSelect = select(withIncludes, args.select);
        accumulator.push(withSelect);
      }
      return accumulator;
    }, []),
    args.skip,
    args.take,
  );

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
