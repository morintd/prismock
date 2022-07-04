/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({ data: { email: 'user1@company.com', password: 'password' } });
  const user2 = await prisma.user.create({ data: { email: 'user2@company.com', password: 'password', warnings: 5 } });
  await prisma.user.create({ data: { email: 'user3@company.com', password: 'password', warnings: 10 } });

  await prisma.post.create({ data: { title: 'title1', authorId: user.id } });
  await prisma.post.create({ data: { title: 'title2', authorId: user2.id } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
