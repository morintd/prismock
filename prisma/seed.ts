/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-misused-promises */
import { PrismaClient } from '@prisma/client';

import { seededBlogs } from '../testing';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.create({ data: { email: 'user1@company.com', password: 'password', warnings: 0 } });
  const user2 = await prisma.user.create({ data: { email: 'user2@company.com', password: 'password', warnings: 5 } });
  await prisma.user.create({ data: { email: 'user3@company.com', password: 'password', warnings: 10 } });

  const blog = await prisma.blog.create({ data: { title: seededBlogs[0].title } });
  const blog2 = await prisma.blog.create({ data: { title: seededBlogs[1].title } });

  await prisma.post.create({ data: { title: 'title1', authorId: user.id, blogId: blog.id } });
  await prisma.post.create({ data: { title: 'title2', authorId: user2.id, blogId: blog2.id } });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
