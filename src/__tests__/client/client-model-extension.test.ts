import { Prisma } from "@prisma/client"
import { createPrismock } from "../../lib/client"
import { mockDeep } from "jest-mock-extended"

describe("client-model-extension", () => {
  describe("model extension", () => {
    const Prismock = createPrismock(Prisma)
    it("should work", () => {
      const prismock = new Prismock()

      const extensions = {
        model: {
          user: {
            findManyExtended: () => {
              const user = mockDeep<Prisma.$UserPayload['scalars']>({
                id: 1,
                email: "extendedClient@foobar.com",
              })
      
              return [user]
            },
          },
        }
      }

      const extendedPrismock = prismock.$extends(extensions)

      const users = extendedPrismock.user.findManyExtended()

      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        id: 1,
        email: "extendedClient@foobar.com",
      })
    })
  })
})