import { Prisma, PrismaClient } from "@prisma/client"
import { DMMF, type DefaultArgs, type DynamicResultExtensionArgs, type ExtendsHook, type ModelKey } from "@prisma/client/runtime/library"

type ModelMap = {
  [K in Prisma.TypeMap["meta"]["modelProps"]]: Prisma.TypeMap["model"][ModelKey<
    Prisma.TypeMap,
    K
  >]["payload"]["scalars"]
}

type ResultExtensionModelMap = DynamicResultExtensionArgs<
  ModelMap & { $allModels: {} },
  Prisma.TypeMap
>

function buildResultExtendedModel<ModelName extends keyof ModelMap>(
  client: PrismaClient,
  proxiedModels: {
    [K in Exclude<keyof ResultExtensionModelMap, "$allModels">]?: PrismaClient[K]
  },
  modelExtensions: ResultExtensionModelMap[ModelName],
  modelName: ModelName,
): PrismaClient[ModelName] {
  const model = proxiedModels[modelName] ?? client[modelName]

  if (Object.keys(modelExtensions).length === 0) {
    return model
  }

  const singleResultActions = [
    DMMF.ModelAction.findFirst,
    DMMF.ModelAction.findFirstOrThrow,
    DMMF.ModelAction.findUnique,
    DMMF.ModelAction.findUniqueOrThrow,
    DMMF.ModelAction.create,
    DMMF.ModelAction.update,
    DMMF.ModelAction.upsert,
  ] as const

  const multipleResultActions = [
    DMMF.ModelAction.findMany,
    DMMF.ModelAction.createManyAndReturn,
    // DMMF.ModelAction.updateManyAndReturn,
  ] as const

  const allResultActions = [...singleResultActions, ...multipleResultActions] as const
  type ProxiedActions = `${(typeof allResultActions)[number]}`

  const proxyMethod = <M extends keyof PrismaClient[ModelName] | DMMF.ModelAction>(actionName: M) => {
    if (!(actionName in model)) {
      return () => null
    }

    const modelMethod = actionName as keyof PrismaClient[ModelName]

    const method = model[modelMethod]

    if (typeof method !== "function") {
      return method
    }

    function attach(value: object) {
      const originalValue = value

      for (const key in modelExtensions) {
        const modelExtension = modelExtensions[key]

        /**
         * This is a computed field that has the same name as one that's already on the object,
         * proxy it so we can call compute and give it the original non-proxied value
         */
        if (key in value) {
          return new Proxy(value, {
            get(target, prop, _receiver) {
              if (prop !== key) {
                return target[prop as keyof typeof target]
              }

              return modelExtension?.compute(target as Parameters<typeof modelExtension.compute>[0])
            },
          })
        }

        Object.defineProperty(value, key, {
          get: () => modelExtension?.compute(originalValue as Parameters<typeof modelExtension.compute>[0]),
          configurable: true,
          enumerable: true,
        })
      }

      return value
    }

    return (...args: any[]) => {
      return method(...args).then((result: any) => {
        if (result === null || result === undefined) {
          return result
        }

        function comp(result: any) {
          if (typeof result !== "object") {
            return result
          }

          if (
            singleResultActions.includes(actionName as (typeof singleResultActions)[number]) &&
            !Array.isArray(result)
          ) {
            return attach(result)
          }

          if (
            multipleResultActions.includes(actionName as (typeof multipleResultActions)[number]) &&
            Array.isArray(result)
          ) {
            return result.map(attach)
          }

          return result
        }

        if ("then" in result) {
          return result.then(comp)
        }

        return comp(result)
      })
    }
  }

  const proxiedMethods: {
    [K in ProxiedActions]?: K extends keyof PrismaClient[ModelName] ? PrismaClient[ModelName][K] : never
  } = allResultActions.reduce(
    (acc, next) => ({
      ...acc,
      [next]: proxyMethod(next),
    }),
    {} as { [K in ProxiedActions]?: K extends keyof PrismaClient[ModelName] ? PrismaClient[ModelName][K] : never },
  )

  const proxiedModel = new Proxy(model, {
    get(target, prop, _receiver) {
      if (prop in proxiedMethods) {
        return proxiedMethods[prop as keyof typeof proxiedMethods]?.bind(target)
      }

      return target[prop as keyof typeof target]
    },
  })

  return proxiedModel
}

export function applyResultExtensions(
  client: PrismaClient,
  extensions: Parameters<ExtendsHook<"define", Prisma.TypeMapCb, DefaultArgs>>[0],
): PrismaClient {
  if (typeof extensions === "function") {
    return client
  }

  const resultExtendedModelMap = (extensions.result ?? {}) as ResultExtensionModelMap

  const extendedModels = Object.keys(
    resultExtendedModelMap,
  ) as (keyof typeof resultExtendedModelMap)[]

  const hasAllModelsExtension = extendedModels.some((model) => model === "$allModels")

  const proxiedModels: {
    [K in Exclude<keyof typeof resultExtendedModelMap, "$allModels">]?: PrismaClient[K]
  } = {}

  function proxyModel<
    ModelName extends Exclude<keyof typeof resultExtendedModelMap, "$allModels">,
  >(modelName: ModelName) {
    const originalModel = proxiedModels[modelName] ?? client[modelName]

    if (!originalModel) {
      return
    }

    const proxiedModel = buildResultExtendedModel(
      client,
      proxiedModels,
      resultExtendedModelMap[modelName],
      modelName,
    )

    proxiedModels[modelName] = proxiedModel

    return proxiedModel
  }

  for (const modelName of extendedModels) {
    if (modelName === "$allModels") {
      continue
    }

    if (!(modelName in client)) {
      continue
    }

    proxyModel(modelName)
  }

  if (hasAllModelsExtension && resultExtendedModelMap["$allModels"]) {
    // TODO
    // const allModelsExtension = resultExtendedModelMap["$allModels"]

    for (const model of Prisma.dmmf.datamodel.models) {
      const modelName = model.name

      if (!(modelName in client)) {
        continue
      }

      const proxiedModel = buildResultExtendedModel(
        client,
        proxiedModels,
        resultExtendedModelMap["$allModels"],
        modelName as Prisma.TypeMap["meta"]["modelProps"],
      )
      
      proxiedModels[modelName as keyof typeof proxiedModels] = proxiedModel as any
    }
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
