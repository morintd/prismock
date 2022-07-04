import { Prisma } from '@prisma/client';

import { DelegateContext, Item } from '../../delegate';
import { camelize, shallowCompare } from '../../helpers';
import { FindWhereArgs } from '../../types';

import { getFieldRelationshipWhere } from './find';

export const matchMultiple = (item: Item, where: FindWhereArgs, context: DelegateContext) => {
  const matchAnd = (item: Record<string, unknown>, where: FindWhereArgs[]) => {
    return where.filter((child) => matchMultiple(item, child, context)).length === where.length;
  };

  const matchOr = (item: Item, where: FindWhereArgs[]) => {
    return where.some((child) => matchMultiple(item, child, context));
  };

  const matchFnc = (where: FindWhereArgs) => (item: Record<string, unknown>) => {
    if (where) {
      return matchMultiple(item, where, context);
    }
    return true;
  };

  function match(child: string, item: Item, where: FindWhereArgs) {
    const val: any = item[child];
    const filter = where[child] as Prisma.Enumerable<FindWhereArgs>;

    if (child === 'OR') return matchOr(item, filter as FindWhereArgs[]);
    if (child === 'AND') return matchAnd(item, filter as FindWhereArgs[]);
    if (child === 'NOT') return !matchOr(item, filter as FindWhereArgs[]);

    if (filter == null || filter === undefined) {
      if (filter === null) return val === null || val === undefined;
      return true;
    }

    if (filter instanceof Date) {
      if (val === undefined) {
        return false;
      }
      if (!(val instanceof Date) || val.getTime() !== filter.getTime()) {
        return false;
      }
    } else {
      if (typeof filter === 'object') {
        const info = context.model.fields.find((field) => field.name === child);
        if (info?.relationName) {
          const childName = camelize(info.type);
          let childWhere: any = {};
          if (filter.every) {
            childWhere = filter.every;
          } else if (filter.some) {
            childWhere = filter.some;
          } else if ((filter as FindWhereArgs).none) {
            childWhere = (filter as FindWhereArgs).none;
          } else {
            childWhere = filter;
          }
          const res = context.data[childName]!.filter(
            matchFnc(Object.assign(Object.assign({}, childWhere), getFieldRelationshipWhere(item, info, context))),
          );
          if (filter.every) {
            if (res.length === 0) return false;
            const all = context.data[childName].filter(matchFnc(getFieldRelationshipWhere(item, info, context)));
            return res.length === all.length;
          } else if (filter.some) {
            return res.length > 0;
          } else if ((filter as FindWhereArgs).none) {
            return res.length === 0;
          }
          return res.length > 0;
        }

        const idFields = context.model.fields.map((field) => field.isId);

        if (idFields?.length > 1) {
          if (child === idFields.join('_')) {
            return shallowCompare(item, filter as FindWhereArgs);
          }
        }

        if (context.model.uniqueFields.length > 0) {
          for (const uniqueField of context.model.uniqueFields) {
            if (child === uniqueField.join('_')) {
              return shallowCompare(item, filter as FindWhereArgs);
            }
          }
        }
        if (val === undefined) return false;

        let match = true;
        if ('equals' in filter && match) {
          match = filter.equals === val;
        }
        if ('startsWith' in filter && match) {
          match = val.indexOf(filter.startsWith) === 0;
        }
        if ('endsWith' in filter && match) {
          match = val.indexOf(filter.endsWith) === val.length - (filter as any).endsWith.length;
        }
        if ('contains' in filter && match) {
          match = val.indexOf(filter.contains) > -1;
        }
        if ('gt' in filter && match) {
          match = val > filter.gt!;
        }
        if ('gte' in filter && match) {
          match = val >= filter.gte!;
        }
        if ('lt' in filter && match) {
          match = val < filter.lt!;
        }
        if ('lte' in filter && match) {
          match = val <= filter.lte!;
        }
        if ('in' in filter && match) {
          match = (filter.in as any)!.includes(val);
        }
        if ('not' in filter && match) {
          match = val !== filter.not;
        }
        if ('notIn' in filter && match) {
          match = !(filter as any).notIn.includes(val);
        }
        if (!match) return false;
      } else if (val !== filter) {
        return false;
      }
    }
    return true;
  }

  for (const child in where) {
    if (!match(child, item, where)) {
      return false;
    }
  }
  return true;
};
