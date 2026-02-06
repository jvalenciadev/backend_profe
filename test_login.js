const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:3000/auth/login', {
            username: 'admin',
            password: 'secret123'
        });
        console.log('Login successful!');
        console.log('Token:', response.data.access_token);
    } catch (e) {
        console.error('Login failed:', e.response?.data || e.message);
    }
}

testLogin();
