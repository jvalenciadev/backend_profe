const { Pool } = require('pg');
async function checkAdmin() {
    const pool = new Pool({
        connectionString: "postgresql://admin:password@localhost:5432/profe_minedu?schema=public"
    });
    try {
        const res = await pool.query("SELECT id, username, correo FROM admins WHERE username = 'admin'");
        console.log('Admin user found:', res.rows[0]);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkAdmin();
