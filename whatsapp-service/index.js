const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const cors = require('cors');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

let sock = null;
let qrCodeData = null;
let isConnected = false;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true // Prints QR in backend console automatically
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            // Generate base64 QR for the frontend
            qrCodeData = await QRCode.toDataURL(qr);
            isConnected = false;
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            isConnected = false;
            qrCodeData = null;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('Opened WhatsApp connection successfully!');
            isConnected = true;
            qrCodeData = null;
        }
    });
}

// REST Endpoints
app.get('/auth/status', (req, res) => {
    res.json({ connected: isConnected, phone: sock?.user?.id || null });
});

app.get('/auth/qr', (req, res) => {
    if (isConnected) {
        return res.json({ connected: true, qr: null });
    }
    res.json({ connected: false, qr: qrCodeData });
});

app.post('/messages/send', async (req, res) => {
    let { phone, message } = req.body;
    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Missing phone or message parameter' });
    }

    if (!isConnected) {
        return res.status(503).json({ success: false, error: 'WhatsApp client is not connected' });
    }

    try {
        // Clean phone number: remove non-digits and append @s.whatsapp.net
        let cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone.endsWith('@s.whatsapp.net')) {
            cleanPhone = `${cleanPhone}@s.whatsapp.net`;
        }

        const sentMsg = await sock.sendMessage(cleanPhone, { text: message });
        res.json({ success: true, messageId: sentMsg.key.id });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`WhatsApp sidecar listening on port ${PORT}`);
    connectToWhatsApp();
});
