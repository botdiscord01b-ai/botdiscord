// เก็บเวลาทำกิจกรรมล่าสุดของแต่ละคน (UserId -> Timestamp)
const lastActivity = new Map();

// 1. บันทึกเมื่อพิมพ์ข้อความในช่องแชท
client.on('messageCreate', (message) => {
    if (message.author.bot || !message.guild) return;
    lastActivity.set(message.author.id, Date.now());
});

// 2. บันทึกเมื่อเข้าห้องเสียง (Voice Channel)
client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;
    if (newState.channelId) {
        lastActivity.set(member.id, Date.now());
    }
});

// 3. ระบบตรวจเช็คสมาชิกที่ไม่แอกทีฟเกิน 30 วัน (รันวันละ 1 ครั้ง)
const INACTIVE_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 วัน (มิลลิวินาที)
const EXCLUDED_ROLE_IDS = ['1550062346435567657']; // ใส่ ID ยศที่ไม่ต้องการให้ถูกถอด (เช่น ยศแอดมิน/บอท)

setInterval(async () => {
    try {
        const guild = client.guilds.cache.first(); // ดึงกิลด์หลัก
        if (!guild) return;

        const members = await guild.members.fetch();
        const now = Date.now();
        const logChannel = guild.channels.cache.get('1538429606409928815'); // ห้อง Log

        for (const [id, member] of members) {
            if (member.user.bot) continue;

            // ตรวจสอบว่ามียศที่ยกเว้นหรือไม่
            const isExcluded = member.roles.cache.some(role => EXCLUDED_ROLE_IDS.includes(role.id));
            if (isExcluded) continue;

            // ดึงเวลาทำกิจกรรมล่าสุด (ถ้าไม่มีในระบบ ให้ใช้เวลาที่เข้าดิสคอร์ดเป็นหลัก)
            const lastActiveTime = lastActivity.get(id) || member.joinedTimestamp;

            if (now - lastActiveTime > INACTIVE_LIMIT_MS) {
                // ดึงรายชื่อยศที่ไม่ใช่ @everyone
                const rolesToRemove = member.roles.cache.filter(role => role.id !== guild.id);

                if (rolesToRemove.size > 0) {
                    await member.roles.remove(rolesToRemove);
                    console.log(`🧹 ถอดยศทั้งหมดจาก ${member.user.tag} เนื่องจากไม่แอกทีฟนานเกิน 30 วัน`);

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
}, 24 * 60 * 60 * 1000); // ตรวจสอบทุกๆ 24 ชั่วโมง
