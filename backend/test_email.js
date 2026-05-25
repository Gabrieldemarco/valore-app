require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('✅ Nodemailer cargado correctamente');

// Opcional: probar configuración (sin enviar)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

console.log('✅ Transporter configurado');