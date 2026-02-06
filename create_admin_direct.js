const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    const pool = new Pool({
        connectionString: "postgresql://admin:password@localhost:5432/profe_minedu?schema=public"
    });

    try {
        const hashedPassword = await bcrypt.hash('secret123', 10);
        console.log('Creating admin user...');

        // Insert user if not exists
        const res = await pool.query(`
            INSERT INTO "admins" (username, correo, password, nombre, apellidos, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (username) DO UPDATE 
            SET password = $3, updated_at = NOW()
            RETURNING id
        `, ['admin', 'admin@profe.bo', hashedPassword, 'Admin', 'Global']);

        const userId = res.rows[0].id;
        console.log('Admin user ID:', userId);

        // Ensure SUPER_ADMIN role exists
        const roleRes = await pool.query(`
            INSERT INTO "roles" (name, guard_name, created_at, updated_at)
            VALUES ('SUPER_ADMIN', 'web', NOW(), NOW())
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
            RETURNING id
        `);
        const roleId = roleRes.rows[0].id;
        console.log('SUPER_ADMIN role ID:', roleId);

        // Assign role to user
        await pool.query(`
            INSERT INTO "model_has_roles" (model_id, role_id, model_type)
            VALUES ($1, $2, 'App\\User')
            ON CONFLICT (model_id, role_id, model_type) DO NOTHING
        `, [userId, roleId]);

        console.log('✅ Admin user created/updated successfully with password: secret123');
    } catch (e) {
        console.error('❌ Error creating admin:', e);
    } finally {
        await pool.end();
    }
}

createAdmin();
