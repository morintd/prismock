import type { Prisma, PrismaClient } from '@prisma/client';
import { applyModelExtensions } from './model';
import { applyQueryExtensions } from './query';
import { applyResultExtensions } from './result';
import type { ExtendsHook, DefaultArgs } from '@prisma/client/runtime/library';

export { applyModelExtensions, applyQueryExtensions, applyResultExtensions };

export type ExtensionsDefinition = Parameters<ExtendsHook<"define", Prisma.TypeMapCb, DefaultArgs>>[0];

export function applyExtensions(client: PrismaClient, extensions: ExtensionsDefinition) {
  const resultExtended = applyResultExtensions(client, extensions);
  const queryExtended = applyQueryExtensions(resultExtended, extensions);
  const modelExtended = applyModelExtensions(queryExtended, extensions);

  return modelExtended;
}
