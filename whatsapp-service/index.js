const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from potential project locations
const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '../backend/.env'),
    path.join(__dirname, '../../whatsapp-bot/.env'),
    path.join(__dirname, '../../../whatsapp-bot/.env')
];
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`Loaded environment variables from: ${envPath}`);
        break;
    }
}

// Global fetch is available in Node 18+
async function askAI(userMessage, systemInstruction) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.warn("GROQ_API_KEY is not configured.");
        return "CASUAL_CHAT";
    }
    try {
        const response = await fetch("https://api.groq.com/openapi/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.1
            })
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    } catch (e) {
        console.error("Groq classification request failed:", e);
        return "CASUAL_CHAT";
    }
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
const cooldowns = new Map();

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
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

    // Listen for incoming WhatsApp messages and trigger sales workflow
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (chatUpdate.type !== 'notify') return;
            for (const msg of chatUpdate.messages) {
                const jid = msg.key.remoteJid;
                if (msg.key.fromMe || jid === 'status@broadcast') continue;

                // 5-second per-user cooldown check to prevent rate-limit spikes
                const now = Date.now();
                const lastTime = cooldowns.get(jid) || 0;
                if (now - lastTime < 5000) {
                    console.log(`⏭️ Ignored message from ${jid} due to 5-second cooldown.`);
                    continue;
                }
                cooldowns.set(jid, now);

                // Extract plain text message content
                const text = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || "").trim();
                if (!text) continue;

                // Restrict group chats to avoid loop spamming
                const isGroup = jid.endsWith('@g.us');
                if (isGroup) continue;

                console.log(`💬 Incoming message from ${jid}: "${text}"`);

                // 1.5-second typing presence gap to prevent Groq TPD rate limits
                await sock.sendPresenceUpdate('composing', jid);
                await new Promise(resolve => setTimeout(resolve, 1500));

                const rawClassification = await askAI(
                    `Analyze this WhatsApp message: "${text}". Classify it as SALES_LEAD or CASUAL_CHAT.`,
                    "You are a text classifier. Respond only with the classification keyword: SALES_LEAD or CASUAL_CHAT."
                );

                const isSalesLead = /sales_lead/i.test(rawClassification);
                if (!isSalesLead) {
                    await sock.sendPresenceUpdate('paused', jid);
                    console.log(`⏭️ Ignored casual chat from ${jid}: "${text}"`);
                    continue;
                }

                // Process sales opportunity lead and route to Flow backend
                console.log(`🚀 Qualified sales lead from ${jid}: "${text}"`);
                
                const workspaceApiUrl = process.env.BACKEND_URL || 'https://flow-backend-api.azurewebsites.net';
                let cleanPhone = jid.replace(/\D/g, '');
                const mockEmail = `${cleanPhone}@whatsapp.flow.hackarena.dev`;

                const response = await fetch(`${workspaceApiUrl}/workflows/simulate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sender: mockEmail,
                        recipient: 'sales@flow.hackarena.dev',
                        subject: 'WhatsApp Order/Query Placement',
                        body: `WhatsApp Message content: "${text}"\nCustomer phone number: +${cleanPhone}`
                    })
                });

                if (response.ok) {
                    const workflowResult = await response.json();
                    await sock.sendPresenceUpdate('paused', jid);
                    await sock.sendMessage(jid, { 
                        text: `👋 Hi, I've received your request! Our sales operations agent has initialized Workflow *#${workflowResult.id}* to check our pricing catalog and inventory.\n\nWe will get back to you with the official quote shortly!` 
                    }, { quoted: msg });
                } else {
                    await sock.sendPresenceUpdate('paused', jid);
                }
            }
        } catch (error) {
            console.error('Error in messages.upsert handler:', error);
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
