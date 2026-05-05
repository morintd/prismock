import { Prisma } from '@prisma/client';

import { Item } from './delegate';

export function camelize(str: string) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

export function shallowCompare(a: Item, b: Item) {
  for (const key in b) {
    if (a[key] instanceof Date) {
      if (b[key] === undefined) {
        return false;
      }
      if (!(b[key] instanceof Date) || b[key].getTime() !== a[key].getTime()) {
        return false;
      }
      continue;
    }
    if (a[key] !== b[key]) return false;
  }
  return true;
}

// Deep equality check for JSON values
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// Get value at JSON path (array of keys)
export function getJsonPath(obj: any, path: any): any {
  if (!Array.isArray(path)) return undefined;
  let current = obj;
  for (const key of path) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}

export function objectContains(target: unknown, subObject: unknown) {
  if (target === subObject) return true;

  if (isObject(target) && isObject(subObject)) {
    return shallowCompare(target, subObject);
  }

  return false;
}

function isObject(value: unknown): value is Item {
  if (!value) return false;
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;

  return true;
}

export function pick(obj: Record<string, unknown>, keys: string[]) {
  return Object.entries(obj).reduce((accumulator, [currentKey, currentValue]) => {
    if (keys.includes(currentKey)) {
      accumulator = { ...accumulator, [currentKey]: currentValue };
    }
    return accumulator;
  }, {});
}

export function omit(obj: Record<string, unknown>, keys: string[]) {
  return Object.entries(obj).reduce((accumulator, [currentKey, currentValue]) => {
    if (!keys.includes(currentKey)) {
      accumulator = { ...accumulator, [currentKey]: currentValue };
    }
    return accumulator;
  }, {});
}

export function uuid() {
  let dt = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
  return uuid;
}

export function removeUndefined(o?: Record<string, unknown>) {
  if (!o) return o;

  return Object.keys(o).reduce((accumulator, currentValue) => {
    if (typeof o[currentValue] !== 'undefined') {
      return {
        ...accumulator,
        [currentValue]: o[currentValue],
      };
    }
    return accumulator;
  }, {} as Item);
}

export function pipe<T>(...functions: Array<(arg: T) => T>) {
  return (value: T) => {
    return functions.reduce((currentValue, currentFunction) => {
      return currentFunction(currentValue);
    }, value);
  };
}

export function compose<T>(...functions: Array<(arg: T) => T>) {
  return (value: T) => {
    return functions.reduceRight((currentValue, currentFunction) => {
      return currentFunction(currentValue);
    }, value);
  };
}

export function unique<T>(value: T[]) {
  return Array.from(new Set(value));
}

export function ensureArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value];
}

export function isJsonFilter(value: unknown): value is Prisma.JsonFilter {
  if (!isObject(value)) return false;

  return [
    'path',
    'equals',
    'not',
    'string_contains',
    'string_starts_withn',
    'string_ends_with',
    'array_contains',
    'array_starts_with',
    'array_ends_with',
  ].some((key) => key in value);
}
