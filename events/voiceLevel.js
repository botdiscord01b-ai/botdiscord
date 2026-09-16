const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const RANKING_CHANNEL_ID = '1549693123872038984'; // ห้องตารางอันดับ
const dataFilePath = path.join(__dirname, '../levels.json');

// 🎭 กำหนดไอดียศ Discord ตามเลเวล (ใส่ ID ยศของคุณแทนที่ได้เลย)
const LEVEL_ROLES = {
    5: '1205000000000000005',   // ยศ Lv.5
    15: '1205000000000000015',  // ยศ Lv.15
    30: '1205000000000000030',  // ยศ Lv.30
    50: '1205000000000000050',  // ยศ Lv.50
};

// 📈 สูตรคำนวณ EXP ที่ต้องใช้สำหรับเลเวลถัดไป (Exponential)
function getXpForNextLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
}

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
        console.log('🔥 [VoiceXP Pro] ระบบเก็บเวลระยะยาวและความยากระดับสูง พร้อมทำงาน!');

        // อัปเดตกระดานอันดับทุกๆ 5 นาที
        setInterval(async () => {
            await updateLeaderboardChannel(client);
        }, 5 * 60 * 1000);

        await updateLeaderboardChannel(client);

        // 🎙️ ตรวจจับเวลาเข้า-ออก และปรับลด EXP หากอยู่คนเดียว/Mute
        client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
            const userId = newState.id || oldState.id;
            const member = newState.member || oldState.member;

            if (!member || member.user.bot) return;

            // 1. กดเข้าห้องเสียง
            if (!oldState.channelId && newState.channelId) {
                voiceStates.set(userId, {
                    startTime: Date.now(),
                    isMuted: newState.selfMute || newState.selfDeaf
                });
            }

            // 2. กดออกจากห้องเสียง
            else if (oldState.channelId && !newState.channelId) {
                const session = voiceStates.get(userId);
                if (!session) return;

                const timeSpentMs = Date.now() - session.startTime;
                voiceStates.delete(userId);

                const minutesSpent = Math.floor(timeSpentMs / (1000 * 60));
                if (minutesSpent < 1) return;

                // 🛡️ ระบบ Anti-AFK: เช็กว่าห้องมีกี่คน และ Mute อยู่หรือไม่
                const oldChannel = oldState.channel;
                const nonBotMembers = oldChannel ? oldChannel.members.filter(m => !m.user.bot).size : 0;
                
                let xpMultiplier = 1.0;
                let isAfk = false;

                // อยู่คนเดียวในห้อง -> ได้ EXP แค่ 20%
                if (nonBotMembers <= 1) {
                    xpMultiplier = 0.2;
                    isAfk = true;
                }
                // ปิดไมค์+ปิดหูฟัง -> ได้ EXP แค่ 30%
                else if (oldState.selfMute && oldState.selfDeaf) {
                    xpMultiplier = 0.3;
                    isAfk = true;
                }

                // ฐาน EXP: 1 นาที = 10 EXP (คูณด้วย Multiplier)
                const xpGained = Math.floor(minutesSpent * 10 * xpMultiplier);

                if (!userLevels[userId]) {
                    userLevels[userId] = { xp: 0, level: 1, totalMinutes: 0, prestige: 0, afkMinutes: 0 };
                }

                userLevels[userId].xp += xpGained;
                userLevels[userId].totalMinutes += minutesSpent;
                if (isAfk) userLevels[userId].afkMinutes = (userLevels[userId].afkMinutes || 0) + minutesSpent;

                // ตรวจสอบเลเวลอัปตามสูตร Exponential
                let currentLevel = userLevels[userId].level;
                let xpNeeded = getXpForNextLevel(currentLevel);

                let leveledUp = false;
                while (userLevels[userId].xp >= xpNeeded) {
                    userLevels[userId].xp -= xpNeeded;
                    userLevels[userId].level += 1;
                    currentLevel = userLevels[userId].level;
                    xpNeeded = getXpForNextLevel(currentLevel);
                    leveledUp = true;
                }

                saveData();

                // ถ้าเลเวลอัป ให้ตรวจเช็กแจกยศ
                if (leveledUp) {
                    await checkAndAssignRoles(member, currentLevel);
                }

                await updateLeaderboardChannel(client);
            }
        });
    }
};

// 🌟 ให้ยศ Discord ตามระดับเลเวล
async function checkAndAssignRoles(member, currentLevel) {
    try {
        for (const [lvl, roleId] of Object.entries(LEVEL_ROLES)) {
            if (currentLevel >= parseInt(lvl)) {
                const role = member.guild.roles.cache.get(roleId);
                if (role && !member.roles.cache.has(roleId)) {
                    await member.roles.add(role).catch(() => {});
                    console.log(`🎖️ แจกยศ ${role.name} ให้ ${member.user.tag} เนื่องจากเลเวลถึง ${lvl}`);
                }
            }
        }
    } catch (err) {
        console.error('❌ Error assigning role:', err.message);
    }
}

// 🟩 สร้าง Progress Bar
function createProgressBar(current, max, length = 8) {
    const percentage = Math.min(Math.max(current / max, 0), 1);
    const progress = Math.round(length * percentage);
    return '🟩'.repeat(progress) + '⬜'.repeat(length - progress);
}

// 📊 ฟังก์ชันอัปเดตกระดานอันดับสวยงาม
async function updateLeaderboardChannel(client) {
    try {
        const channel = await client.channels.fetch(RANKING_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const sorted = Object.entries(userLevels)
            .sort(([, a], [, b]) => {
                const totalScoreA = (a.prestige * 1000000) + (a.level * 10000) + a.xp;
                const totalScoreB = (b.prestige * 1000000) + (b.level * 10000) + b.xp;
                return totalScoreB - totalScoreA;
            })
            .slice(0, 10);

        let top3Text = '';
        let restText = '';
        const medals = ['👑 **อันดับ 1**', '🥈 **อันดับ 2**', '🥉 **อันดับ 3**'];

        if (sorted.length === 0) {
            top3Text = '```text\nยังไม่มีข้อมูลการใช้งานห้องเสียงในขณะนี้\n```';
        } else {
            for (let i = 0; i < sorted.length; i++) {
                const [id, stats] = sorted[i];
                const member = await channel.guild.members.fetch(id).catch(() => null);
                const name = member ? member.displayName : 'ไม่พบสมาชิก';

                const hours = Math.floor(stats.totalMinutes / 60);
                const mins = stats.totalMinutes % 60;
                const timeFormatted = hours > 0 ? `${hours} ชม. ${mins} นาที` : `${mins} นาที`;

                const maxXp = getXpForNextLevel(stats.level);
                const progressBar = createProgressBar(stats.xp, maxXp);
                const prestigeBadge = stats.prestige > 0 ? ` 🌟[จุติ ${stats.prestige}]` : '';

                if (i < 3) {
                    top3Text += `${medals[i]} ➔ **${name}**${prestigeBadge}\n` +
                                `┗ 🎖️ **Lv.${stats.level}** \`[${stats.xp}/${maxXp} EXP]\` ${progressBar}\n` +
                                `┗ ⏱️ เวลาสิงรวม: **${timeFormatted}**\n\n`;
                } else {
                    restText += `\`#${i + 1}\` **${name}**${prestigeBadge} ➔ **Lv.${stats.level}** \`(${timeFormatted})\` | \`[${stats.xp}/${maxXp}]\`\n`;
                }
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 HARDCORE VOICE LEADERBOARD — ตารางอันดับสายสิงห้องเสียง')
            .setDescription(`🔄 อัปเดตข้อมูลล่าสุด: <t:${Math.floor(Date.now() / 1000)}:R>\n⚠️ *หมายเหตุ: การสิงห้องเสียงคนเดียวหรือ Mute จะได้รับ EXP เพียง 20-30%*\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n${top3Text}`)
            .addFields(
                restText ? { name: '🎖️ อันดับอื่นๆ (Rank #4 - #10)', value: restText } : { name: '\u200B', value: '\u200B' }
            )
            .setThumbnail(channel.guild.iconURL({ dynamic: true, size: 512 }))
            .setFooter({ text: '⚙️ ระบบคำนวณความยากแบบก้าวหน้า (Exponential Leveling System)', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

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
