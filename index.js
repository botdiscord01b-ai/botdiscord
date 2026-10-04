require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 1. เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('🟢 เชื่อมต่อฐานข้อมูล MongoDB สำเร็จแล้ว!');
})
.catch((err) => {
    console.error('❌ ไม่สามารถเชื่อมต่อ MongoDB ได้:', err);
});

// 2. สร้างตัวแปร client พร้อมกำหนด Intents และ Partials (ต้องอยู่ก่อนนำไปใช้งาน)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// 3. เก็บ Collection สำหรับรวบรวมคำสั่ง Slash Commands
client.commands = new Collection();

// 4. ฟังก์ชันโหลดคำสั่งจากโฟลเดอร์ commands
function loadCommands() {
    const foldersPath = path.join(__dirname, 'commands');
    if (fs.existsSync(foldersPath)) {
        const commandItems = fs.readdirSync(foldersPath);
        for (const item of commandItems) {
            const itemPath = path.join(foldersPath, item);
            if (fs.statSync(itemPath).isDirectory()) {
                const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = path.join(itemPath, file);
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        client.commands.set(command.data.name, command);
                    }
                }
            } else if (item.endsWith('.js')) {
                const filePath = itemPath;
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                }
            }
        }
    }
}

// 5. ฟังก์ชันโหลด Event จากโฟลเดอร์ events แบบอัตโนมัติ
function loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        }
    }
}

// 6. รันฟังก์ชันโหลดทั้งหมด
loadCommands();
loadEvents();

// 7. เข้าสู่ระบบ Discord ด้วย Token
client.login(process.env.TOKEN);
