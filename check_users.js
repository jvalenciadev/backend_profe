const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const count = await prisma.user.count();
        console.log('Total users:', count);
        const users = await prisma.user.findMany({ select: { username: true } });
        console.log('Usernames:', users.map(u => u.username));
    } catch (e) {
        console.error('Error checking users:', e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
