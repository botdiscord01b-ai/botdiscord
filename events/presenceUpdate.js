const { Events } = require('discord.js');

module.exports = {
    name: Events.PresenceUpdate,
    async execute(oldPresence, newPresence) {
        // 🆔 ระบุ ID ห้องสำหรับบันทึกกิจกรรม (Presence Log)
        const PRESENCE_LOG_ID = '1525003524164026468';

        if (!newPresence || !newPresence.member || newPresence.user.bot) return;

        const guild = newPresence.guild;
        const user = newPresence.user;
        const member = newPresence.member;

        // ฟังก์ชันดึงเวลาปัจจุบัน (อ้างอิงรูปแบบจากโค้ดตัวอย่างของคุณ)
        const getTime = () => new Date().toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        // ฟังก์ชันดึงข้อมูลสมาชิก
        const getMemberInfo = async () => {
            try {
                const fetchedMember = await guild.members.fetch(user.id).catch(() => null);
                return {
                    name: user.tag || `${user.username}#${user.discriminator}`,
                    displayName: fetchedMember ? fetchedMember.displayName : member.displayName || user.username,
                    id: user.id
                };
            } catch {
                return {
                    name: user.tag || user.username,
                    displayName: member.displayName || user.username,
                    id: user.id
                };
            }
        };

        // ฟังก์ชันค้นหาช่อง Log
        const getChannel = async (id) => {
            try {
                return guild.channels.cache.get(id) || await guild.channels.fetch(id);
            } catch (err) {
                console.error('❌ ไม่พบห้องบันทึกกิจกรรม:', err.message);
                return null;
            }
        };

        const logChannel = await getChannel(PRESENCE_LOG_ID);
        if (!logChannel) return;

        const info = await getMemberInfo();

        try {
            // -------------------------------------------------------------
            // 1. ตรวจจับการเล่นเกม (Type 0 = Playing)
            // -------------------------------------------------------------
            const oldGame = oldPresence?.activities.find(a => a.type === 0);
            const newGame = newPresence.activities.find(a => a.type === 0);

            // 🎮 เข้าเล่นเกม
            if (!oldGame && newGame) {
                let detailsText = '';
                if (newGame.details) detailsText += `\n- รายละเอียด: ${newGame.details}`;
                if (newGame.state) detailsText += `\n- สถานะ: ${newGame.state}`;

                await logChannel.send(`\`\`\`md
# 🎮 เข้าเล่นเกม
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- เกม: ${newGame.name}${detailsText}
- เวลา: ${getTime()}
\`\`\``);
            }

            // ⏹️ เลิกเล่นเกม
            if (oldGame && !newGame) {
                await logChannel.send(`\`\`\`md
# ⏹️ เลิกเล่นเกม
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- เกม: ${oldGame.name}
- เวลา: ${getTime()}
\`\`\``);
            }

            // 🔄 เปลี่ยนเกมที่เล่น
            if (oldGame && newGame && oldGame.name !== newGame.name) {
                await logChannel.send(`\`\`\`md
# 🔄 เปลี่ยนเกมที่เล่น
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- จากเกม: ${oldGame.name}
- ไปเกม: ${newGame.name}
- เวลา: ${getTime()}
\`\`\``);
            }

            // -------------------------------------------------------------
            // 2. ตรวจจับการฟังเพลง Spotify
            // -------------------------------------------------------------
            const oldSpotify = oldPresence?.activities.find(a => a.name === 'Spotify');
            const newSpotify = newPresence.activities.find(a => a.name === 'Spotify');

            if (!oldSpotify && newSpotify) {
                const trackName = newSpotify.details || 'ไม่ระบุ';
                const artistName = newSpotify.state || 'ไม่ระบุ';
                const albumName = newSpotify.assets?.largeText || 'ไม่ระบุ';

                await logChannel.send(`\`\`\`md
# 🎵 เริ่มฟังเพลง Spotify
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- เพลง: ${trackName}
- ศิลปิน: ${artistName}
- อัลบั้ม: ${albumName}
- เวลา: ${getTime()}
\`\`\``);
            }

            // -------------------------------------------------------------
            // 3. ตรวจจับการสตรีมสด (Type 1 = Streaming)
            // -------------------------------------------------------------
            const oldStream = oldPresence?.activities.find(a => a.type === 1);
            const newStream = newPresence.activities.find(a => a.type === 1);

            if (!oldStream && newStream) {
                await logChannel.send(`\`\`\`md
# 🔴 เริ่มสตรีมสด
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- หัวข้อ: ${newStream.details || newStream.name}
- ลิงก์สตรีม: ${newStream.url || 'ไม่มีลิงก์'}
- เวลา: ${getTime()}
\`\`\``);
            }

        } catch (err) {
            console.error('❌ ส่ง log กิจกรรมไม่ได้:', err.message);
        }
    }
};
