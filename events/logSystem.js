const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log('=====================================');
        console.log('🚀 ระบบ Log (รองรับชื่อเล่นในเซิร์ฟเวอร์ & ID) พร้อมทำงาน');
        console.log('=====================================');

        const LOG_CHANNEL_ID = '1494379391327928370';       // ห้องสำหรับข้อความแชท/แก้ไข/ลบ
        const VOICE_LOG_ID = '1525003524164026468';         // ห้องสำหรับเข้า-ออกห้องเสียง

        const getTime = () => new Date().toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        const getChannel = async (id, type) => {
            try {
                return client.channels.cache.get(id) || await client.channels.fetch(id);
            } catch (err) {
                console.error(`❌ ไม่พบห้อง ${type}:`, err.message);
                return null;
            }
        };

        const getMemberInfo = async (guild, user) => {
            if (!guild || !user) return { name: user?.tag || 'Unknown', displayName: user?.username || 'Unknown', id: user?.id || 'N/A' };
            try {
                const member = await guild.members.fetch(user.id).catch(() => null);
                return {
                    name: user.tag,
                    displayName: member ? member.displayName : user.username,
                    id: user.id
                };
            } catch {
                return { name: user.tag, displayName: user.username, id: user.id };
            }
        };

        // 🎧 1. ตรวจจับการเข้า-ออก/ย้ายห้องเสียง
        client.on('voiceStateUpdate', async (oldState, newState) => {
            const member = newState.member || oldState.member;
            if (!member || member.user.bot) return;

            const logChannel = await getChannel(VOICE_LOG_ID, 'บันทึกเสียง');
            if (!logChannel) return;

            try {
                const info = await getMemberInfo(member.guild, member.user);

                if (!oldState.channel && newState.channel) {
                    await logChannel.send(`\`\`\`md
# 🟢 เข้าห้องเสียง
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: ${newState.channel.name} (ID: ${newState.channel.id})
- เวลา: ${getTime()}
\`\`\``);
                }

                if (oldState.channel && !newState.channel) {
                    await logChannel.send(`\`\`\`md
# 🔴 ออกจากห้องเสียง
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: ${oldState.channel.name} (ID: ${oldState.channel.id})
- เวลา: ${getTime()}
\`\`\``);
                }

                if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                    await logChannel.send(`\`\`\`md
# 🔄 เปลี่ยนห้องเสียง
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- จากห้อง: ${oldState.channel.name} (${oldState.channel.id})
- ไปห้อง: ${newState.channel.name} (${newState.channel.id})
- เวลา: ${getTime()}
\`\`\``);
                }
            } catch (err) {
                console.error('❌ ส่ง log ห้องเสียงไม่ได้:', err.message);
            }
        });

        // 📝 2. บันทึกข้อความแชทใหม่
        client.on('messageCreate', async (message) => {
            if (!message.guild || message.author.bot) return;
            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความ');
            if (!logChannel) return;

            const info = await getMemberInfo(message.guild, message.author);
            const content = message.content || '(ไฟล์ / รูปภาพ)';
            try {
                await logChannel.send(`\`\`\`md
# 📝 ข้อความใหม่
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: #${message.channel.name} (ID: ${message.channel.id})
- เนื้อหา: ${content.slice(0, 800)}
- เวลา: ${getTime()}
\`\`\``);
            } catch {}
        });

        // 🗑️ 3. บันทึกข้อความที่ถูกลบ
        client.on('messageDelete', async (message) => {
            if (!message.guild || message.author?.bot) return;
            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความลบ');
            if (!logChannel) return;

            const info = message.author ? await getMemberInfo(message.guild, message.author) : { displayName: 'Unknown', name: 'Unknown', id: 'N/A' };
            const content = message.content || '(ไม่มีข้อความ / อาจเป็นรูปภาพหรือ Embed)';
            try {
                await logChannel.send(`\`\`\`md
# 🗑️ ข้อความถูกลบ
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: #${message.channel.name} (ID: ${message.channel.id})
- ข้อความที่ลบ: ${content.slice(0, 800)}
- เวลา: ${getTime()}
\`\`\``);
            } catch {}
        });

        // ✏️ 4. บันทึกข้อความที่ถูกแก้ไข
        client.on('messageUpdate', async (oldMessage, newMessage) => {
            if (!newMessage.guild || newMessage.author?.bot) return;
            if (oldMessage.content === newMessage.content) return;

            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความแก้ไข');
            if (!logChannel) return;

            const info = await getMemberInfo(newMessage.guild, newMessage.author);
            try {
                await logChannel.send(`\`\`\`md
# ✏️ ข้อความถูกแก้ไข
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: #${newMessage.channel.name} (ID: ${newMessage.channel.id})
- ข้อความเดิม: ${oldMessage.content || '(ไม่มีข้อความ)'}
- ข้อความใหม่: ${newMessage.content || '(ไม่มีข้อความ)'}
- เวลา: ${getTime()}
\`\`\``);
            } catch {}
        });

        console.log('✅ ระบบ Log ทั้งหมดทำงานสมบูรณ์แล้ว');
    }
};
