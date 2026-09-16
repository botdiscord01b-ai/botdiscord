const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const RANKING_CHANNEL_ID = '1549693123872038984'; // ห้องตารางอันดับ
const dataFilePath = path.join(__dirname, '../levels.json');

// โหลดข้อมูลจากไฟล์ JSON
let userLevels = {};
if (fs.existsSync(dataFilePath)) {
    try {
        userLevels = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    } catch (e) {
        userLevels = {};
    }
}

function saveData() {
    fs.writeFileSync(dataFilePath, JSON.stringify(userLevels, null, 2));
}

const voiceStates = new Map();

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('✨ [VoiceXP] ระบบตารางอันดับสุดเท่ พร้อมทำงานแล้ว!');

        // อัปเดตกระดานอันดับทุกๆ 5 นาที
        setInterval(async () => {
            await updateLeaderboardChannel(client);
        }, 5 * 60 * 1000);

        // อัปเดตทันทีที่เปิดบอท
        await updateLeaderboardChannel(client);

        // 🎙️ ฟัง Event การเข้า-ออกจากห้องเสียง
        client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
            const userId = newState.id || oldState.id;
            const member = newState.member || oldState.member;

            if (!member || member.user.bot) return;

            // 1. กดเข้าห้องเสียง
            if (!oldState.channelId && newState.channelId) {
                voiceStates.set(userId, Date.now());
            }

            // 2. ออกจากห้องเสียง
            else if (oldState.channelId && !newState.channelId) {
                const joinTime = voiceStates.get(userId);
                if (!joinTime) return;

                const timeSpentMs = Date.now() - joinTime;
                voiceStates.delete(userId);

                const minutesSpent = Math.floor(timeSpentMs / (1000 * 60));
                if (minutesSpent < 1) return; // ไม่ถึง 1 นาทีไม่นับ

                const xpGained = minutesSpent * 10; // 1 นาที = 10 XP

                if (!userLevels[userId]) {
                    userLevels[userId] = { xp: 0, level: 1, totalMinutes: 0 };
                }

                userLevels[userId].xp += xpGained;
                userLevels[userId].totalMinutes += minutesSpent;

                let currentLevel = userLevels[userId].level;
                let xpNeeded = currentLevel * 100;

                while (userLevels[userId].xp >= xpNeeded) {
                    userLevels[userId].xp -= xpNeeded;
                    userLevels[userId].level += 1;
                    currentLevel = userLevels[userId].level;
                    xpNeeded = currentLevel * 100;
                }

                saveData();
                
                // อัปเดตกระดานอันดับทันทีหลังจากมีคนออกจากห้องเสียง
                await updateLeaderboardChannel(client);
            }
        });
    }
};

// 🌟 ฟังก์ชันสร้าง Progress Bar (แถบพลัง)
function createProgressBar(current, max, length = 8) {
    const percentage = Math.min(Math.max(current / max, 0), 1);
    const progress = Math.round(length * percentage);
    const emptyProgress = length - progress;
    return '🟩'.repeat(progress) + '⬜'.repeat(emptyProgress);
}

// 📊 ฟังก์ชันอัปเดตการ์ดอันดับสวยงาม
async function updateLeaderboardChannel(client) {
    try {
        const channel = await client.channels.fetch(RANKING_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        // เรียงลำดับจาก Level และ XP สูงสุด -> ต่ำสุด (Top 10)
        const sorted = Object.entries(userLevels)
            .sort(([, a], [, b]) => (b.level * 100 + b.xp) - (a.level * 100 + a.xp))
            .slice(0, 10);

        let top3Text = '';
        let restText = '';
        const medals = ['👑 **อันดับ 1**', '🥈 **อันดับ 2**', '🥉 **อันดับ 3**'];

        if (sorted.length === 0) {
            top3Text = '```text\nยังไม่มีข้อมูลการสิงห้องเสียงในขณะนี้\n```';
        } else {
            for (let i = 0; i < sorted.length; i++) {
                const [id, stats] = sorted[i];
                const member = await channel.guild.members.fetch(id).catch(() => null);
                const name = member ? member.displayName : 'ไม่พบสมาชิก';

                // แปลงเวลาเป็น ชั่วโมง / นาที
                const hours = Math.floor(stats.totalMinutes / 60);
                const mins = stats.totalMinutes % 60;
                const timeFormatted = hours > 0 ? `${hours} ชม. ${mins} นาที` : `${mins} นาที`;

                // คำนวณ % แถบพลัง
                const maxXp = stats.level * 100;
                const progressBar = createProgressBar(stats.xp, maxXp);

                if (i < 3) {
                    // จัดรูปแบบสำหรับ TOP 3 (ตัวใหญ่ เด่นชัด)
                    top3Text += `${medals[i]} ➔ **${name}**\n` +
                                `┗ 🎖️ **Lv.${stats.level}** \`[${stats.xp}/${maxXp}]\` ${progressBar}\n` +
                                `┗ ⏱️ เวลาสะสม: **${timeFormatted}**\n\n`;
                } else {
                    // จัดรูปแบบสำหรับ อันดับ 4 - 10
                    restText += `\`#${i + 1}\` **${name}** ➔ **Lv.${stats.level}** \`(${timeFormatted})\` | \`[${stats.xp}/${maxXp}]\`\n`;
                }
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700') // สีทอง
            .setTitle('🏆 HALL OF FAME — ตารางอันดับสายสิงห้องเสียง')
            .setDescription(`🔄 อัปเดตข้อมูลล่าสุด: <t:${Math.floor(Date.now() / 1000)}:R>\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n${top3Text}`)
            .addFields(
                restText ? { name: '🎖️ อันดับอื่นๆ (Rank #4 - #10)', value: restText } : { name: '\u200B', value: '\u200B' }
            )
            .setThumbnail(channel.guild.iconURL({ dynamic: true, size: 512 }))
            .setFooter({ text: '⚙️ ระบบสะสม EXP อัตโนมัติ: 1 นาทีในห้องเสียง = +10 EXP', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        // ค้นหาข้อความเดิมเพื่อทำการ Edit
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (botMessage) {
            await botMessage.edit({ embeds: [embed] });
        } else {
            await channel.send({ embeds: [embed] });
        }

    } catch (error) {
        console.error('❌ [Ranking Error] ไม่สามารถอัปเดตตารางอันดับได้:', error.message);
    }
}
