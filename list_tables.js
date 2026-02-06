const { Pool } = require('pg');
async function listTables() {
    const pool = new Pool({
        connectionString: "postgresql://admin:password@localhost:5432/profe_minedu?schema=public"
    });
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:', res.rows.map(r => r.table_name));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
listTables();
