import type { Prisma } from "@prisma/client"
import type { ExtendsHook, DefaultArgs } from "@prisma/client/runtime/library"
import type { PrismaClient } from "@prisma/client"

export function applyQueryExtensions(
  client: PrismaClient,
  extensions: Parameters<ExtendsHook<"define", Prisma.TypeMapCb, DefaultArgs>>[0],
): PrismaClient {
  if (typeof extensions === "function") {
    return client
  }

  const queryExtendedModelMap = extensions.query ?? {}

  const extendedModels = Object.keys(
    queryExtendedModelMap,
  ) as (keyof typeof queryExtendedModelMap)[]

  // TODO
  // const _hasAllModelsExtension = extendedModels.some((model) => model === "$allModels")

  const proxiedModels: {
    [K in Prisma.TypeMap["meta"]["modelProps"]]?: PrismaClient[K]
  } = {}

  for (const modelName of extendedModels) {
    if (modelName === "$allModels") {
      continue
    }

    if (!(modelName in client)) {
      continue
    }

    const extension = queryExtendedModelMap[modelName]

    if (!extension) {
      continue
    }

    if (typeof extension !== "object") {
      continue
    }

    const extendedMethods = extension

    function proxyQueryMethod<
      Method extends Exclude<keyof typeof extendedMethods, "$allOperations">,
      ModelName extends Exclude<keyof typeof queryExtendedModelMap, "$allModels">,
    >(method: Method, modelName: ModelName, target: any) {
      if (!(method in extendedMethods)) {
        return target[method]
      }

      const extension = queryExtendedModelMap[modelName]

      if (!extension || typeof extension !== "object") {
        return target[method]
      }

      const extendedMethod = extension[method]

      if (!extendedMethod) {
        return target[method]
      }

      const obj = {
        [method]: function (args: any) {
          // @ts-expect-error tsc falls over because it can't express the signatures of this union type of functions
          return extendedMethod({
            model: modelName,
            operation: method,
            args,
            query: (modifiedArgs: any) => target[method](modifiedArgs),
          })
        },
      }

      return obj[method].bind(target)
    }

    proxiedModels[modelName as keyof typeof proxiedModels] = new Proxy(client[modelName as keyof typeof client] as any, {
      get(target, prop, _receiver) {
        if (!(prop in extendedMethods)) {
          return target[prop as keyof typeof target]
        }

        const extendedMethod = extendedMethods[prop as keyof typeof extendedMethods]

        if (!extendedMethod) {
          return target[prop as keyof typeof target]
        }

        return proxyQueryMethod(
          prop as Exclude<keyof typeof extendedMethods, "$allOperations">,
          modelName,
          target,
        )
      },
    })
  }

  return new Proxy(client, {
    get(target, prop, _receiver) {
      if (prop in proxiedModels) {
        return proxiedModels[prop as keyof typeof proxiedModels]
      }

      return target[prop as keyof typeof target]
    },
  })
}
