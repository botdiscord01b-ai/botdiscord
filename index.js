require('dotenv').config();
const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// เชื่อมต่อ MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('🟢 เชื่อมต่อฐานข้อมูล MongoDB สำเร็จแล้ว!');
}).catch((err) => {
    console.error('❌ ไม่สามารถเชื่อมต่อ MongoDB ได้:', err);
});

// 1. สร้างตัวแปร client พร้อมกำหนด Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// 2. เก็บเวลากิจกรรมล่าสุดของแต่ละสมาชิก (UserId -> Timestamp)
const lastActivity = new Map();
const INACTIVE_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 วัน
const EXCLUDED_ROLE_IDS = ['1550062346435567657']; // ยศที่ไม่ถูกถอด

// 3. บันทึกกิจกรรม
client.on('messageCreate', (message) => {
    if (message.author.bot || !message.guild) return;
    lastActivity.set(message.author.id, Date.now());
});

client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;
    if (newState.channelId) {
        lastActivity.set(member.id, Date.now());
    }
});

// 4. ฟังก์ชันลงทะเบียน Slash Commands อัตโนมัติ
async function deployCommands(clientId, token) {
    const commands = [];
    const foldersPath = path.join(__dirname, 'commands');

    if (fs.existsSync(foldersPath)) {
        const commandItems = fs.readdirSync(foldersPath);
        for (const item of commandItems) {
            const itemPath = path.join(foldersPath, item);
            if (fs.lstatSync(itemPath).isDirectory()) {
                const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const filePath = path.join(itemPath, file);
                    const command = require(filePath);
                    if ('data' in command) commands.push(command.data.toJSON());
                }
            } else if (item.endsWith('.js')) {
                const command = require(itemPath);
                if ('data' in command) commands.push(command.data.toJSON());
            }
        }
    }

    if (commands.length > 0 && token && clientId) {
        const rest = new REST({ version: '10' }).setToken(token);
        try {
            console.log(`🔄 กำลังลงทะเบียนคำสั่ง Slash Commands อัตโนมัติ (${commands.length} คำสั่ง)...`);
            await rest.put(Routes.applicationCommands(clientId), { body: commands });
            console.log('✅ ลงทะเบียนคำสั่ง Slash Commands เรียบร้อยแล้ว!');
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการลงทะเบียนคำสั่ง:', error);
        }
    }
}

// 5. เมื่อบอทพร้อมใช้งาน
client.once('ready', async () => {
    console.log(`🤖 บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);

    await deployCommands(client.user.id, process.env.DISCORD_TOKEN);

    // รันตรวจเช็ค Inactive ทุกๆ 24 ชั่วโมง
    setInterval(async () => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) return;

            const members = await guild.members.fetch();
            const now = Date.now();
            const logChannel = guild.channels.cache.get('1538429606409928815');

            for (const [id, member] of members) {
                if (member.user.bot) continue;

                const isExcluded = member.roles.cache.some(role => EXCLUDED_ROLE_IDS.includes(role.id));
                if (isExcluded) continue;

                const lastActiveTime = lastActivity.get(id) || member.joinedTimestamp;

                if (now - lastActiveTime > INACTIVE_LIMIT_MS) {
                    const rolesToRemove = member.roles.cache.filter(role => role.id !== guild.id);

                    if (rolesToRemove.size > 0) {
                        await member.roles.remove(rolesToRemove);
                        console.log(`🧹 ถอดยศจาก ${member.user.tag} เนื่องจากไม่แอกทีฟนานเกิน 30 วัน`);

                        if (logChannel) {
                            const formattedDate = new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH', { hour12: false });
                            await logChannel.send(
                                '```md\n' +
                                `# ⚠ ถอดยศเนื่องจากไม่มีความเคลื่อนไหว (30 วัน)\n` +
                                `- สมาชิก: ${member.user.tag} (${member.id})\n` +
                                `- ชื่อในดิสคอร์ด: ${member.displayName}\n` +
                                `- ยศที่ถูกถอด: ${rolesToRemove.map(r => r.name).join(', ')}\n` +
                                `- เวลา: ${formattedDate}\n` +
                                '```'
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ เกิดข้อผิดพลาดในการตรวจเช็คผู้ใช้ที่ไม่แอกทีฟ:', error);
        }
    }, 24 * 60 * 60 * 1000);
});

// 6. เรียกใช้งาน Event Interaction
const interactionEvent = require('./events/interactionCreate.js');
client.on(interactionEvent.name, (...args) => interactionEvent.execute(...args));

// 7. ล็อกอิน
client.login(process.env.DISCORD_TOKEN);
