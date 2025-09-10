import { Prisma } from "@prisma/client"
import { createPrismock } from "../../lib/client"
import { mock } from "jest-mock-extended"


describe("client-model-extension", () => {
  describe("model extension", () => {
    const Prismock = createPrismock(Prisma)
    it("should work", () => {
      const prismock = new Prismock()

      const extensions = {
        model: {
          user: {
            findManyExtended: () => {
              const user = mock<Prisma.$UserPayload['scalars']>({
                id: 1,
                email: "extendedClient@foobar.com",
              })
      
              console.log("USER!", user)
      
              return [user]
            },
          },
        }
      }

      const extendedPrismock = prismock.$extends(extensions)

      const users = extendedPrismock.user.findManyExtended()
      console.log("USERS!", users)
      console.log("USERS 0!", users[0])

      expect(users).toHaveLength(1)
      expect(users[0]).toEqual(expect.objectContaining({
        id: 1,
        email: "extendedClient@foobar.com",
      }))
    })
  })
})