const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBlogs() {
    try {
        const blogs = await prisma.blog.findMany({
            take: 5,
            select: {
                id: true,
                titulo: true,
                imagenes: true
            }
        });

        console.log('--- BLOGS DATA INSPECTION ---');
        console.log(JSON.stringify(blogs, null, 2));
        console.log('-----------------------------');
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkBlogs();
