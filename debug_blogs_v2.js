const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBlogs() {
    try {
        const blogs = await prisma.blog.findMany({
            take: 3,
            select: {
                imagenes: true
            }
        });

        console.log('--- IMAGENES DATA ---');
        blogs.forEach((b, i) => {
            console.log(`Blog ${i}:`, b.imagenes);
            console.log(`Type:`, typeof b.imagenes);
            if (Array.isArray(b.imagenes)) console.log('Is Array: Yes');
            else console.log('Is Array: No');
        });
        console.log('---------------------');
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkBlogs();
