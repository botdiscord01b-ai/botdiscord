const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('=====================================');
        console.log('🚀 รวมระบบ Log (ข้อความ/ห้องเสียง/กิจกรรม/สำรองรูปภาพ) พร้อมทำงาน');
        console.log('=====================================');

        // 🆔 ตั้งค่า ID ห้อง Log ทั้งหมด
        const LOG_CHANNEL_ID = '1494379391327928370';       // ห้อง Log ข้อความ (พิมพ์/แก้ไข/ลบ)
        const VOICE_LOG_ID = '1525003524164026468';         // ห้อง Log เสียง (เข้า/ออก/ย้าย/แชร์จอ/เปิดกล้อง)
        const PRESENCE_LOG_ID = '1547938786632011786';      // ห้อง Log กิจกรรม (เกม/Spotify/สตรีมสด)
        const MEDIA_LOG_ID = '1549316883356848249';         // 🖼️ ห้องเก็บสำรองรูปภาพและไฟล์แนบ

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

                if (!oldState.streaming && newState.streaming) {
                    await logChannel.send(`\`\`\`md\n# 🖥️ เริ่มสตรีมหน้าจอ\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${newState.channel?.name || 'ไม่ทราบห้อง'} (ID: ${newState.channel?.id || 'N/A'})\n- เวลา: ${getTime()}\n\`\`\``);
                }

                if (oldState.streaming && !newState.streaming) {
                    await logChannel.send(`\`\`\`md\n# 🛑 ปิดสตรีมหน้าจอ\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${newState.channel?.name || oldState.channel?.name || 'ไม่ทราบห้อง'}\n- เวลา: ${getTime()}\n\`\`\``);
                }

                if (!oldState.selfVideo && newState.selfVideo) {
                    await logChannel.send(`\`\`\`md\n# 📷 เปิดกล้อง\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${newState.channel?.name || 'ไม่ทราบห้อง'} (ID: ${newState.channel?.id || 'N/A'})\n- เวลา: ${getTime()}\n\`\`\``);
                }

                if (!oldState.channel && newState.channel) {
                    await logChannel.send(`\`\`\`md\n# 🟢 เข้าห้องเสียง\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${newState.channel.name} (ID: ${newState.channel.id})\n- เวลา: ${getTime()}\n\`\`\``);
                }

                if (oldState.channel && !newState.channel) {
                    await logChannel.send(`\`\`\`md\n# 🔴 ออกจากห้องเสียง\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${oldState.channel.name} (ID: ${oldState.channel.id})\n- เวลา: ${getTime()}\n\`\`\``);
                }

                if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                    await logChannel.send(`\`\`\`md\n# 🔄 เปลี่ยนห้องเสียง\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- จากห้อง: ${oldState.channel.name} (${oldState.channel.id})\n- ไปห้อง: ${newState.channel.name} (${newState.channel.id})\n- เวลา: ${getTime()}\n\`\`\``);
                }
            } catch (err) {
                console.error('❌ ส่ง log ห้องเสียงไม่ได้:', err.message);
            }
        });

        // ----------------------------------------------------
        // 📝 2. ระบบบันทึกข้อความ & 🖼️ สำรองรูปภาพ
        // ----------------------------------------------------
        client.on('messageCreate', async (message) => {
            if (!message.guild || message.author.bot) return;

            // 🖼️ 2.1 ส่วนคัดลอกรูปภาพ/ไฟล์แนบไปเก็บในห้อง Media Log
            if (message.attachments.size > 0) {
                const mediaChannel = await getChannel(MEDIA_LOG_ID, 'สำรองรูปภาพ');
                if (mediaChannel) {
                    const info = await getMemberInfo(message.guild, message.author);
                    const fileUrls = message.attachments.map(a => a.url);

                    try {
                        await mediaChannel.send({
                            content: `\`\`\`md\n# 🖼️ สำรองรูปภาพ/ไฟล์แนบ\n- ส่งโดย: ${info.displayName} (${info.name})\n- User ID: ${info.id}\n- จากห้อง: #${message.channel.name}\n- แคปชัน: ${message.content || 'ไม่มีข้อความ'}\n- เวลา: ${getTime()}\n\`\`\`\n${fileUrls.join('\n')}`,
                            files: Array.from(message.attachments.values()).map(a => a.url) // ส่งไฟล์ซ้ำเข้าห้อง Log เพื่อให้ Discord เก็บไฟล์ไว้อย่างถาวร
                        });
                    } catch (err) {
                        console.error('❌ คัดลอกรูปภาพไปห้อง Media Log ไม่สำเร็จ:', err.message);
                    }
                }
            }

            // 📝 2.2 บันทึกข้อความทั่วไป
            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความ');
            if (!logChannel) return;

            const info = await getMemberInfo(message.guild, message.author);
            const content = parseContent(message);
            try {
                await logChannel.send(`\`\`\`md\n# 📝 ข้อความใหม่\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- ห้อง: #${message.channel.name} (ID: ${message.channel.id})\n- เนื้อหา: ${content.slice(0, 1500)}\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });

        client.on('messageDelete', async (message) => {
            if (!message.guild || message.author?.bot) return;
            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความลบ');
            if (!logChannel) return;

            const info = message.author ? await getMemberInfo(message.guild, message.author) : { displayName: 'Unknown', name: 'Unknown', id: 'N/A' };
            const content = parseContent(message);
            try {
                await logChannel.send(`\`\`\`md\n# 🗑️ ข้อความถูกลบ\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- ห้อง: #${message.channel.name} (ID: ${message.channel.id})\n- ข้อความที่ลบ: ${content.slice(0, 1500)}\n- เวลา: ${getTime()}\n\`\`\``);
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
                await logChannel.send(`\`\`\`md\n# ✏️ ข้อความถูกแก้ไข\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- ห้อง: #${newMessage.channel.name} (ID: ${newMessage.channel.id})\n- ข้อความเดิม: ${oldContent.slice(0, 700)}\n- ข้อความใหม่: ${newContent.slice(0, 700)}\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });

        // ----------------------------------------------------
        // 🎮 3. ระบบกิจกรรมผู้ใช้ (เกม / Spotify / สตรีมสด)
        // ----------------------------------------------------
        client.on('presenceUpdate', async (oldPresence, newPresence) => {
            if (!newPresence || !newPresence.member || newPresence.user.bot) return;

            const member = newPresence.member;
            if (member.roles.cache.size <= 1) return;

            const logChannel = await getChannel(PRESENCE_LOG_ID, 'บันทึกกิจกรรม');
            if (!logChannel) return;

            try {
                const info = await getMemberInfo(newPresence.guild, newPresence.user);

                const oldGame = oldPresence?.activities.find(a => a.type === 0);
                const newGame = newPresence.activities.find(a => a.type === 0);

                if (!oldGame && newGame) {
                    let detailsText = '';
                    if (newGame.details) detailsText += `\n- รายละเอียด: ${newGame.details}`;
                    if (newGame.state) detailsText += `\n- สถานะ: ${newGame.state}`;

                    await logChannel.send(`\`\`\`md\n# 🎮 เข้าเล่นเกม\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- เกม: ${newGame.name}${detailsText}\n- เวลา: ${getTime()}\n\`\`\``);
                }

                if (oldGame && newGame && oldGame.name !== newGame.name) {
                    await logChannel.send(`\`\`\`md\n# 🔄 เปลี่ยนเกมที่เล่น\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- จากเกม: ${oldGame.name}\n- ไปเกม: ${newGame.name}\n- เวลา: ${getTime()}\n\`\`\``);
                }

                const oldSpotify = oldPresence?.activities.find(a => a.name === 'Spotify');
                const newSpotify = newPresence.activities.find(a => a.name === 'Spotify');

                if (!oldSpotify && newSpotify) {
                    await logChannel.send(`\`\`\`md\n# 🎵 เริ่มฟังเพลง Spotify\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- เพลง: ${newSpotify.details || 'ไม่ระบุ'}\n- ศิลปิน: ${newSpotify.state || 'ไม่ระบุ'}\n- อัลบั้ม: ${newSpotify.assets?.largeText || 'ไม่ระบุ'}\n- เวลา: ${getTime()}\n\`\`\``);
                }

                const oldStream = oldPresence?.activities.find(a => a.type === 1);
                const newStream = newPresence.activities.find(a => a.type === 1);

                if (!oldStream && newStream) {
                    await logChannel.send(`\`\`\`md\n# 🔴 เริ่มสตรีมสด\n- ชื่อเล่นในเซิร์ฟเวอร์: ${info.displayName}\n- ชื่อหลัก (Username): ${info.name}\n- User ID: ${info.id}\n- หัวข้อ: ${newStream.details || newStream.name}\n- ลิงก์สตรีม: ${newStream.url || 'ไม่มีลิงก์'}\n- เวลา: ${getTime()}\n\`\`\``);
                }
            } catch (err) {
                console.error('❌ ส่ง log กิจกรรมไม่ได้:', err.message);
            }
        });
    }
};
