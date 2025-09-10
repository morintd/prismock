import type { Prisma, PrismaClient } from '@prisma/client';
import type { DefaultArgs, ExtendsHook } from '@prisma/client/runtime/library';

type ExtensionsDefinition = Parameters<ExtendsHook<'define', Prisma.TypeMapCb, DefaultArgs>>[0]

export function applyModelExtensions(
  client: PrismaClient,
  extensions: ExtensionsDefinition,
): PrismaClient {
  if (typeof extensions === 'function') {
    return client;
  }

  const model = extensions.model ?? {};

  const extendedModels = Object.keys(model) as (keyof typeof model)[];

  const hasAllModelsExtension = extendedModels.some((model) => model === '$allModels');

  const proxiedModels: { [K in Exclude<keyof typeof model, '$allModels'>]?: PrismaClient[K] } = {};

  function proxyModel<ModelName extends Exclude<keyof typeof model, '$allModels'>>(modelName: ModelName): PrismaClient[ModelName] {
    const originalModel = proxiedModels[modelName] ?? client[modelName];

    const extension = model[modelName];

    const proxiedModel = new Proxy(originalModel, {
      get(target, prop, receiver) {
        if (!extension || !(prop in extension)) {
          return target[prop as keyof typeof target];
        }

        const extensionMethod = extension[prop as any];

        if (typeof extensionMethod !== 'function') {
          return target[prop as keyof typeof target];
        }

        return (extensionMethod as Function).bind(receiver);
      },
    });

    proxiedModels[modelName] = proxiedModel;

    return proxiedModel;
  }

  for (const modelName of extendedModels) {
    if (modelName === '$allModels') {
      continue;
    }

    if (!(modelName in client)) {
      continue;
    }

    proxyModel(modelName);
  }

  if (hasAllModelsExtension && model['$allModels']) {
    const extension = model['$allModels'];

    for (const modelName of extendedModels) {
      const originalModel = proxiedModels[modelName as keyof typeof proxiedModels] ?? client[modelName as keyof typeof client];

      const proxiedModel = new Proxy(originalModel, {
        get(target, prop, receiver) {
          if (!(prop in extension)) {
            return target[prop as keyof typeof target];
          }

          const extensionMethod = extension[prop as any];

          if (typeof extensionMethod !== 'function') {
            return target[prop as keyof typeof target];
          }

          return extensionMethod.bind(receiver);
        },
      });

      proxiedModels[modelName as keyof typeof proxiedModels] = proxiedModel as any;
    }
  }

  return new Proxy(client, {
    get(target, prop, _receiver) {
      if (prop in proxiedModels) {
        return proxiedModels[prop as keyof typeof proxiedModels];
      }

      return target[prop as keyof typeof target];
    },
  });
}
