const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        // ID ของห้องรับแขกของคุณ (โปรดตรวจสอบให้แน่ใจว่า ID นี้ถูกต้อง)
        const WELCOME_CHANNEL_ID = '1205000338382524416'; 

        try {
            const channel = await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
            if (!channel) return;

            // สร้าง Embed สำหรับข้อความต้อนรับ
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#00ffcc') // สีฟ้าอมเขียว
                .setTitle('🎉 ยินดีต้อนรับสมาชิกใหม่เข้าสู่เซิร์ฟเวอร์!')
                .setDescription(`สวัสดีคุณ ${member} ขอให้สนุกกับการเล่นเกมและพูดคุยใน **${member.guild.name}** นะครับ!`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 })) // แสดงรูปโปรไฟล์ของสมาชิก
                
                // --- แก้ไขตรงนี้: ใช้ลิงก์ใหม่ที่มีเสถียรภาพ ---
                .setImage('https://lh3.googleusercontent.com/u/0/drive-viewer/AK7aPaA3_2s_w_i9_1-h_J_i_1_2_3_4_5_6_7_8_9_0_1_2_3_4_5_6_7_8_9_0=w1600-h1000') 
                // ---------------------------------------------
                
                .addFields(
                    { name: '📜 คำแนะนำเบื้องต้น', value: 'อย่าลืมไปกดยืนยันตัวตน/รับยศที่ห้องรับยศ และอ่านกฎของเซิร์ฟเวอร์ด้วยนะครับ' },
                    { name: '👥 สมาชิกคนที่', value: `${member.guild.memberCount}`, inline: true } // แสดงจำนวนสมาชิกล่าสุด
                )
                .setFooter({ text: 'ระบบต้อนรับอัตโนมัติ', iconURL: member.guild.iconURL() }) // แสดงไอคอนเซิร์ฟเวอร์
                .setTimestamp();

            // ส่งข้อความต้อนรับพร้อมกับ Embed ไปยังห้องที่กำหนด
            await channel.send({
                content: `🎉 ยินดีต้อนรับ ${member} เข้าสู่เซิร์ฟเวอร์ครับ!`,
                embeds: [welcomeEmbed]
            });

            console.log(`[WELCOME] ส่งข้อความต้อนรับให้ ${member.user.tag} สำเร็จ`);
        } catch (error) {
            console.error('[WELCOME] เกิดข้อผิดพลาดในการส่งข้อความต้อนรับ:', error);
        }
    }
};
