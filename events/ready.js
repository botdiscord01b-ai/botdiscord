const { Events } = require('discord.js');
const MemberActivity = require('../models/MemberActivity'); // ดึง Schema ที่เราสร้างไว้

const EXEMPT_ROLE_ID = '1527270612291158077'; // ยศยกเว้นการถอดยศ
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 30 วัน

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ บอทชื่อ ${client.user.tag} ออนไลน์แล้ว!`);

        // รันตรวจสอบทันทีเมื่อบอทเปิด (หรือจะใช้ setInterval ให้เช็กทุกๆ 24 ชั่วโมงก็ได้)
        // checkInactiveMembers(client);

        // ตั้งเวลาให้เช็กทุก 24 ชั่วโมง (24 * 60 * 60 * 1000 มิลลิวินาที)
        setInterval(() => {
            checkInactiveMembers(client);
        }, 24 * 60 * 60 * 1000);
    },
};

// ฟังก์ชันสำหรับตรวจสอบสมาชิกที่ไม่ได้เคลื่อนไหวเกิน 30 วัน
async function checkInactiveMembers(client) {
    console.log('🔍 กำลังตรวจสอบสมาชิกที่ไม่ได้ใช้งานเกิน 30 วัน...');

    for (const [guildId, guild] of client.guilds.cache) {
        try {
            await guild.members.fetch();
            const members = guild.members.cache;

            for (const [memberId, member] of members) {
                if (member.user.bot) continue;

                // ถ้ายกเว้น (มี Role ยกเว้น) ให้ข้ามทันที ไม่ถอดยศ
                if (member.roles.cache.has(EXEMPT_ROLE_ID)) continue;

                // ค้นหาประวัติจาก MongoDB
                let activity = await MemberActivity.findOne({ guildId, userId: memberId });

                if (!activity) {
                    // ถ้ายังไม่มีประวัติใน DB (ป้องกันคนเก่าโดนเตะตอนเริ่มระบบ) 
                    // ให้สร้างข้อมูลตั้งต้นเป็นเวลาปัจจุบันทันที
                    await MemberActivity.create({ guildId, userId: memberId, lastActive: new Date() });
                    continue;
                }

                // คำนวณเวลาที่ไม่ได้แอคทีฟ
                const inactiveTime = Date.now() - new Date(activity.lastActive).getTime();

                if (inactiveTime > THIRTY_DAYS_MS) {
                    console.log(`⚠️ สมาชิก ${member.user.tag} ไม่แอคทีฟเกิน 30 วัน`);
                    
                    // TODO: ใส่โค้ดถอดยศหรือจัดการสมาชิกตรงนี้
                    // เช่น: await member.roles.remove('ID_ยศที่ต้องการถอด');
                }
            }
        } catch (error) {
            console.error(`❌ เกิดข้อผิดพลาดในการตรวจสอบสมาชิกในเซิร์ฟเวอร์ ${guild.name}:`, error);
        }
    }
}
