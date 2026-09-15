const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('=====================================');
        console.log('🚀 รวมระบบ Log (ข้อความ/ห้องเสียง/กิจกรรม) พร้อมทำงาน');
        console.log('=====================================');

        // 🆔 ตั้งค่า ID ห้อง Log ทั้งหมดตรงนี้
        const LOG_CHANNEL_ID = '1494379391327928370';       // ห้อง Log ข้อความ (พิมพ์/แก้ไข/ลบ)
        const VOICE_LOG_ID = '1525003524164026468';         // ห้อง Log เสียง (เข้า/ออก/ย้าย/แชร์จอ/เปิดกล้อง)
        const PRESENCE_LOG_ID = '1547938786632011786';      // ห้อง Log กิจกรรม (เกม/Spotify/สตรีมสด)

        // ----------------------------------------------------
        // 🛠️ Helper Functions
        // ----------------------------------------------------
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
                    name: user.tag || user.username,
                    displayName: member ? member.displayName : user.username,
                    id: user.id
                };
            } catch {
                return { name: user.tag || user.username, displayName: user.username, id: user.id };
            }
        };

        const parseContent = (msg) => {
            let text = msg.content || '';
            if (msg.attachments && msg.attachments.size > 0) {
                const files = msg.attachments.map(a => a.url).join('\n');
                text += text ? `\n\n📎 [ไฟล์แนบ]\n${files}` : `📎 [ไฟล์แนบ]\n${files}`;
            }
            return text || '(ไม่มีข้อความ / สติกเกอร์ / Embed)';
        };

        // ----------------------------------------------------
        // 🎧 1. ระบบห้องเสียง / เปิดกล้อง / แชร์หน้าจอ
        // ----------------------------------------------------
        client.on('voiceStateUpdate', async (oldState, newState) => {
            const member = newState.member || oldState.member;
            if (!member || member.user.bot) return;

            const logChannel = await getChannel(VOICE_LOG_ID, 'บันทึกเสียง');
            if (!logChannel) return;

            try {
                const info = await getMemberInfo(member.guild, member.user);

                // 🖥️ เริ่มสตรีมหน้าจอ
                if (!oldState.streaming && newState.streaming) {
                    await logChannel.send(`\`\`\`md
# 🖥️ เริ่มสตรีมหน้าจอ
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: ${newState.channel?.name || 'ไม่ทราบห้อง'} (ID: ${newState.channel?.id || 'N/A'})
- เวลา: ${getTime()}
\`\`\``);
                }

                // 🛑 ปิดสตรีมหน้าจอ
                if (oldState.streaming && !newState.streaming) {
                    await logChannel.send(`\`\`\`md
# 🛑 ปิดสตรีมหน้าจอ
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: ${newState.channel?.name || oldState.channel?.name || 'ไม่ทราบห้อง'}
- เวลา: ${getTime()}
\`\`\``);
                }

                // 📷 เปิดกล้อง
                if (!oldState.selfVideo && newState.selfVideo) {
                    await logChannel.send(`\`\`\`md
# 📷 เปิดกล้อง
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: ${newState.channel?.name || 'ไม่ทราบห้อง'} (ID: ${newState.channel?.id || 'N/A'})
- เวลา: ${getTime()}
\`\`\``);
                }

                // 🟢 เข้าห้องเสียง
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

                // 🔴 ออกจากห้องเสียง
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

                // 🔄 เปลี่ยนห้องเสียง
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

        // ----------------------------------------------------
        // 📝 2. ระบบบันทึกข้อความ (พิมพ์/ลบ/แก้ไข)
        // ----------------------------------------------------
        client.on('messageCreate', async (message) => {
            if (!message.guild || message.author.bot) return;
            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความ');
            if (!logChannel) return;

            const info = await getMemberInfo(message.guild, message.author);
            const content = parseContent(message);
            try {
                await logChannel.send(`\`\`\`md
# 📝 ข้อความใหม่
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: #${message.channel.name} (ID: ${message.channel.id})
- เนื้อหา: ${content.slice(0, 1500)}
- เวลา: ${getTime()}
\`\`\``);
            } catch {}
        });

        client.on('messageDelete', async (message) => {
            if (!message.guild || message.author?.bot) return;
            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความลบ');
            if (!logChannel) return;

            const info = message.author ? await getMemberInfo(message.guild, message.author) : { displayName: 'Unknown', name: 'Unknown', id: 'N/A' };
            const content = parseContent(message);
            try {
                await logChannel.send(`\`\`\`md
# 🗑️ ข้อความถูกลบ
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: #${message.channel.name} (ID: ${message.channel.id})
- ข้อความที่ลบ: ${content.slice(0, 1500)}
- เวลา: ${getTime()}
\`\`\``);
            } catch {}
        });

        client.on('messageUpdate', async (oldMessage, newMessage) => {
            if (!newMessage.guild || newMessage.author?.bot) return;
            if (oldMessage.content === newMessage.content) return;

            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความแก้ไข');
            if (!logChannel) return;

            const info = await getMemberInfo(newMessage.guild, newMessage.author);
            const oldContent = parseContent(oldMessage);
            const newContent = parseContent(newMessage);
            try {
                await logChannel.send(`\`\`\`md
# ✏️ ข้อความถูกแก้ไข
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- ห้อง: #${newMessage.channel.name} (ID: ${newMessage.channel.id})
- ข้อความเดิม: ${oldContent.slice(0, 700)}
- ข้อความใหม่: ${newContent.slice(0, 700)}
- เวลา: ${getTime()}
\`\`\``);
            } catch {}
        });

        // ----------------------------------------------------
        // 🎮 3. ระบบกิจกรรมผู้ใช้ (เกม / Spotify / สตรีมสด)
        // ----------------------------------------------------
        client.on('presenceUpdate', async (oldPresence, newPresence) => {
            if (!newPresence || !newPresence.member || newPresence.user.bot) return;

            const member = newPresence.member;
            // เงื่อนไข: คนไม่มียศ ห้ามส่ง Log
            if (member.roles.cache.size <= 1) return;

            const logChannel = await getChannel(PRESENCE_LOG_ID, 'บันทึกกิจกรรม');
            if (!logChannel) return;

            try {
                const info = await getMemberInfo(newPresence.guild, newPresence.user);

                // 🎮 1. ตรวจจับการเล่นเกม
                const oldGame = oldPresence?.activities.find(a => a.type === 0);
                const newGame = newPresence.activities.find(a => a.type === 0);

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

                // 🎵 2. ตรวจจับ Spotify
                const oldSpotify = oldPresence?.activities.find(a => a.name === 'Spotify');
                const newSpotify = newPresence.activities.find(a => a.name === 'Spotify');

                if (!oldSpotify && newSpotify) {
                    await logChannel.send(`\`\`\`md
# 🎵 เริ่มฟังเพลง Spotify
- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}
- ชื่อหลัก (Username): ${info.name}
- User ID: ${info.id}
- เพลง: ${newSpotify.details || 'ไม่ระบุ'}
- ศิลปิน: ${newSpotify.state || 'ไม่ระบุ'}
- อัลบั้ม: ${newSpotify.assets?.largeText || 'ไม่ระบุ'}
- เวลา: ${getTime()}
\`\`\``);
                }

                // 🔴 3. ตรวจจับการสตรีมสด
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
        });
    }
};
