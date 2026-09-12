const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.PresenceUpdate,
    async execute(oldPresence, newPresence) {
        // 🆔 ระบุ ID ของห้อง Log ที่ต้องการส่งข้อความไป
        const LOG_CHANNEL_ID = '1547938786632011786';

        if (!newPresence || !newPresence.member || newPresence.user.bot) return;

        const logChannel = newPresence.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        const member = newPresence.member;
        const user = newPresence.user;

        // ดึงเวลาปัจจุบัน รูปแบบ HH:mm:ss
        const timeString = new Date().toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // -------------------------------------------------------------
        // 1. ระบบ LOG การเล่นเกม (Type 0 = Playing)
        // -------------------------------------------------------------
        const oldGame = oldPresence?.activities.find(a => a.type === 0);
        const newGame = newPresence.activities.find(a => a.type === 0);

        // 🟢 เข้าเล่นเกม
        if (!oldGame && newGame) {
            let extraDetails = '';
            if (newGame.details) extraDetails += `\n- **รายละเอียด:** ${newGame.details}`;
            if (newGame.state) extraDetails += `\n- **สถานะ/ปาร์ตี้:** ${newGame.state}`;

            const embed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setDescription(
                    `# 🎮 เข้าเล่นเกม\n` +
                    `- **ชื่อเล่นในเซิร์ฟเวอร์:** ${member.displayName}\n` +
                    `- **ชื่อหลัก (Username):** ${user.username}\n` +
                    `- **User ID:** ${user.id}\n` +
                    `- **เกม:** ${newGame.name}` +
                    `${extraDetails}\n` +
                    `- **เวลา:** ${timeString}`
                );

            await logChannel.send({ embeds: [embed] });
        }

        // 🔴 เลิกเล่นเกม
        if (oldGame && !newGame) {
            const embed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setDescription(
                    `# ⏹️ เลิกเล่นเกม\n` +
                    `- **ชื่อเล่นในเซิร์ฟเวอร์:** ${member.displayName}\n` +
                    `- **ชื่อหลัก (Username):** ${user.username}\n` +
                    `- **User ID:** ${user.id}\n` +
                    `- **เกม:** ${oldGame.name}\n` +
                    `- **เวลา:** ${timeString}`
                );

            await logChannel.send({ embeds: [embed] });
        }

        // 🔄 เปลี่ยนเกมที่เล่น
        if (oldGame && newGame && oldGame.name !== newGame.name) {
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setDescription(
                    `# 🔄 เปลี่ยนเกมที่เล่น\n` +
                    `- **ชื่อเล่นในเซิร์ฟเวอร์:** ${member.displayName}\n` +
                    `- **ชื่อหลัก (Username):** ${user.username}\n` +
                    `- **User ID:** ${user.id}\n` +
                    `- **จากเกม:** ${oldGame.name}\n` +
                    `- **ไปเกม:** ${newGame.name}\n` +
                    `- **เวลา:** ${timeString}`
                );

            await logChannel.send({ embeds: [embed] });
        }

        // -------------------------------------------------------------
        // 2. ระบบ LOG การฟังเพลง Spotify (Listening)
        // -------------------------------------------------------------
        const oldSpotify = oldPresence?.activities.find(a => a.name === 'Spotify');
        const newSpotify = newPresence.activities.find(a => a.name === 'Spotify');

        if (!oldSpotify && newSpotify) {
            const trackName = newSpotify.details || 'ไม่ระบุ';
            const artistName = newSpotify.state || 'ไม่ระบุ';
            const albumName = newSpotify.assets?.largeText || 'ไม่ระบุ';

            const embed = new EmbedBuilder()
                .setColor('#1db954')
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setDescription(
                    `# 🎵 เริ่มฟังเพลง Spotify\n` +
                    `- **ชื่อเล่นในเซิร์ฟเวอร์:** ${member.displayName}\n` +
                    `- **ชื่อหลัก (Username):** ${user.username}\n` +
                    `- **User ID:** ${user.id}\n` +
                    `- **เพลง:** ${trackName}\n` +
                    `- **ศิลปิน:** ${artistName}\n` +
                    `- **อัลบั้ม:** ${albumName}\n` +
                    `- **เวลา:** ${timeString}`
                );

            await logChannel.send({ embeds: [embed] });
        }

        // -------------------------------------------------------------
        // 3. ระบบ LOG การสตรีมสด (Type 1 = Streaming)
        // -------------------------------------------------------------
        const oldStream = oldPresence?.activities.find(a => a.type === 1);
        const newStream = newPresence.activities.find(a => a.type === 1);

        if (!oldStream && newStream) {
            const embed = new EmbedBuilder()
                .setColor('#9146ff')
                .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() })
                .setDescription(
                    `# 🔴 เริ่มสตรีมสด\n` +
                    `- **ชื่อเล่นในเซิร์ฟเวอร์:** ${member.displayName}\n` +
                    `- **ชื่อหลัก (Username):** ${user.username}\n` +
                    `- **User ID:** ${user.id}\n` +
                    `- **หัวข้อ:** ${newStream.details || newStream.name}\n` +
                    `- **แพลตฟอร์ม/ลิงก์:** ${newStream.url || 'ไม่มีลิงก์'}\n` +
                    `- **เวลา:** ${timeString}`
                );

            await logChannel.send({ embeds: [embed] });
        }
    },
};
