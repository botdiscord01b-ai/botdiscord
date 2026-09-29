require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');

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

// 3. บันทึกเมื่อมีการพิมพ์ข้อความ
client.on('messageCreate', (message) => {
    if (message.author.bot || !message.guild) return;
    lastActivity.set(message.author.id, Date.now());
});

// 4. บันทึกเมื่อมีการเข้าห้องเสียง
client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;
    if (newState.channelId) {
        lastActivity.set(member.id, Date.now());
    }
});

// 5. เมื่อบอทพร้อมใช้งาน ให้เริ่ม Loop ตรวจเช็คคนไม่ออกเสียง/ไม่พิมพ์ 30 วัน
client.once('ready', () => {
    console.log(`🤖 บอทออนไลน์แล้วในชื่อ: ${client.user.tag}`);

    // รันตรวจเช็คทุกๆ 24 ชั่วโมง
    setInterval(async () => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) return;

            const members = await guild.members.fetch();
            const now = Date.now();
            const logChannel = guild.channels.cache.get('1538429606409928815');

            for (const [id, member] of members) {
                if (member.user.bot) continue;

                // ข้ามยศที่ยกเว้น
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
                                `# ⚠️️ ถอดยศเนื่องจากไม่มีความเคลื่อนไหว (30 วัน)\n` +
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

// 6. เรียกใช้งาน Event Interaction จากไฟล์ events/interactionCreate.js
const interactionEvent = require('./events/interactionCreate.js');
client.on(interactionEvent.name, (...args) => interactionEvent.execute(...args));

// 7. ล็อกอินเข้าใช้งานบอท
client.login(process.env.DISCORD_TOKEN);
