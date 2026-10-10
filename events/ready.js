const { Events } = require('discord.js');
const MemberActivity = require('../models/MemberActivity'); // เรียกใช้งาน Mongoose Schema
const { initGameTrackers } = require('./gameTracker.js');  // เรียกใช้งานระบบติดตามเกม Steam & Epic Games

const EXEMPT_ROLE_ID = '1527270612291158077'; // ยศยกเว้นการถอดยศ
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 30 วัน

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`✅ บอทชื่อ ${client.user.tag} ออนไลน์แล้ว!`);

        // ==========================================
        // 1. ระบบนาฬิกาแสดง วัน-เวลา ในห้องเสียง
        // ==========================================
        const CHANNEL_ID = '1526811651607629834';  

        const updateClockChannels = async () => {
            const ch = client.channels.cache.get(CHANNEL_ID);
            if (!ch) return;

            const now = new Date();
            const day = now.toLocaleDateString('en-US', { timeZone: 'Asia/Bangkok', day: '2-digit' });
            const month = now.toLocaleDateString('en-US', { timeZone: 'Asia/Bangkok', month: 'short' });
            const dateShort = `${day}-${month}`;  

            const timeString = now.toLocaleTimeString('th-TH', {
                timeZone: 'Asia/Bangkok',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            const newRoomName = `📅︱${dateShort}︱${timeString}`;

            if (ch.name !== newRoomName) {
                await ch.setName(newRoomName).catch(err => console.error('❌ ไม่สามารถเปลี่ยนชื่อห้องได้:', err.message));
            }
        };

        const startSyncTimeout = () => {
            const now = new Date();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();

            const nextTargetMinute = Math.ceil((minutes + 0.1) / 10) * 10;
            const minutesToWait = nextTargetMinute - minutes;
            const msToWait = (minutesToWait * 60 * 1000) - (seconds * 1000);

            setTimeout(async () => {
                await updateClockChannels();
                setInterval(async () => {
                    await updateClockChannels();
                }, 600000); // ทุกๆ 10 นาที
            }, msToWait);
        };

        await updateClockChannels();
        startSyncTimeout();
        console.log('✅ ระบบแสดง วัน-เวลา ในห้องเสียงเริ่มทำงานแล้ว!');


        // ==========================================
        // 2. ระบบตรวจสอบสมาชิกไม่แอคทีฟ 30 วัน (MongoDB)
        // ==========================================
        const checkInactiveMembers = async () => {
            console.log('🔍 กำลังตรวจสอบสมาชิกที่ไม่ได้ใช้งานเกิน 30 วัน...');
            for (const [guildId, guild] of client.guilds.cache) {
                try {
                    await guild.members.fetch();
                    const members = guild.members.cache;

                    for (const [memberId, member] of members) {
                        if (member.user.bot) continue;

                        // ถ้ายกเว้น (มี Role ยกเว้น) ให้ข้ามทันที
                        if (member.roles.cache.has(EXEMPT_ROLE_ID)) continue;

                        // ค้นหาประวัติการใช้งานล่าสุดจาก MongoDB
                        let activity = await MemberActivity.findOne({ guildId, userId: memberId });

                        if (!activity) {
                            // 🛡️ ป้องกันปัญหา: ถ้ายังไม่มีข้อมูลใน DB ให้สร้างข้อมูลตั้งต้นเป็น "เวลาปัจจุบัน"
                            await MemberActivity.create({ guildId, userId: memberId, lastActive: new Date() });
                            continue;
                        }

                        // คำนวณเวลาที่ไม่ได้แอคทีฟ
                        const inactiveTime = Date.now() - new Date(activity.lastActive).getTime();

                        if (inactiveTime > THIRTY_DAYS_MS) {
                            console.log(`⚠️ สมาชิก ${member.user.tag} ไม่แอคทีฟเกิน 30 วัน`);
                            
                            // 📌 โค้ดสำหรับถอดยศ (สามารถใส่ไอดีรอนที่ต้องการถอดตรงนี้ได้เลย)
                            // เช่น: await member.roles.remove('ID_ยศที่ต้องการถอด');
                        }
                    }
                } catch (error) {
                    console.error(`❌ เกิดข้อผิดพลาดในการตรวจสอบสมาชิกในเซิร์ฟเวอร์ ${guild.name}:`, error);
                }
            }
        };

        // รันเช็กทุกๆ 24 ชั่วโมง
        setInterval(checkInactiveMembers, 24 * 60 * 60 * 1000);


        // ==========================================
        // 3. ระบบติดตามเกมใหม่ (Steam & Epic Games Tracker)
        // ==========================================
        try {
            initGameTrackers(client);
        } catch (error) {
            console.error('❌ ไม่สามารถเปิดใช้งานระบบ Game Trackers ได้:', error);
        }
    },
};
