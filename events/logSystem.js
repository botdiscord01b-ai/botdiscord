const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('=====================================');
        console.log('🚀 รวมระบบ Log แบบสมบูรณ์ (23 กิจกรรม) พร้อมทำงาน');
        console.log('=====================================');

        // 🆔 ตั้งค่า ID ห้อง Log ทั้งหมด
        const LOG_CHANNEL_ID = '1494379391327928370';       // Log ข้อความ (พิมพ์/แก้ไข/ลบ)
        const VOICE_LOG_ID = '1525003524164026468';         // Log เสียง (เข้า/ออก/ย้าย/แชร์จอ/เปิดกล้อง)
        const PRESENCE_LOG_ID = '1547938786632011786';      // Log กิจกรรม (เกม/Spotify/สตรีมสด)
        const MEDIA_LOG_ID = '1549316883356848249';         // Log สำรองรูปภาพและไฟล์แนบ
        const SERVER_LOG_ID = '1549433574829326366';        // 🛡️ Log เซิร์ฟเวอร์ (เข้า-ออก/ยศ/เปลี่ยนชื่อ/สร้าง-ลบห้อง/แบน)

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
                    await logChannel.send(`\`\`\`md\n# 🖥️ เริ่มสตรีมหน้าจอ\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${newState.channel?.name || 'ไม่ทราบห้อง'}\n- เวลา: ${getTime()}\n\`\`\``);
                }
                if (oldState.streaming && !newState.streaming) {
                    await logChannel.send(`\`\`\`md\n# 🛑 ปิดสตรีมหน้าจอ\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${newState.channel?.name || oldState.channel?.name || 'ไม่ทราบห้อง'}\n- เวลา: ${getTime()}\n\`\`\``);
                }
                if (!oldState.selfVideo && newState.selfVideo) {
                    await logChannel.send(`\`\`\`md\n# 📷 เปิดกล้อง\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${newState.channel?.name || 'ไม่ทราบห้อง'}\n- เวลา: ${getTime()}\n\`\`\``);
                }
                if (!oldState.channel && newState.channel) {
                    await logChannel.send(`\`\`\`md\n# 🟢 เข้าห้องเสียง\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${newState.channel.name} (ID: ${newState.channel.id})\n- เวลา: ${getTime()}\n\`\`\``);
                }
                if (oldState.channel && !newState.channel) {
                    await logChannel.send(`\`\`\`md\n# 🔴 ออกจากห้องเสียง\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- ห้อง: ${oldState.channel.name} (ID: ${oldState.channel.id})\n- เวลา: ${getTime()}\n\`\`\``);
                }
                if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                    await logChannel.send(`\`\`\`md\n# 🔄 เปลี่ยนห้องเสียง\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- จากห้อง: ${oldState.channel.name}\n- ไปห้อง: ${newState.channel.name}\n- เวลา: ${getTime()}\n\`\`\``);
                }
            } catch (err) {
                console.error('❌ ส่ง log ห้องเสียงไม่ได้:', err.message);
            }
        });

        // ----------------------------------------------------
        // 📝 2. บันทึกข้อความ & 🖼️ สำรองรูปภาพ
        // ----------------------------------------------------
        client.on('messageCreate', async (message) => {
            if (!message.guild || message.author.bot) return;

            if (message.attachments.size > 0) {
                const mediaChannel = await getChannel(MEDIA_LOG_ID, 'สำรองรูปภาพ');
                if (mediaChannel) {
                    const info = await getMemberInfo(message.guild, message.author);
                    const fileUrls = message.attachments.map(a => a.url).join('\n');
                    try {
                        await mediaChannel.send({
                            content: `\`\`\`md\n# 🖼️ สำรองรูปภาพ/ไฟล์แนบ\n- ส่งโดย: ${info.displayName} (${info.name})\n- User ID: ${info.id}\n- จากห้อง: #${message.channel.name}\n- แคปชัน: ${message.content || 'ไม่มีข้อความ'}\n- เวลา: ${getTime()}\n\`\`\`\n${fileUrls}`
                        });
                    } catch {}
                }
            }

            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความ');
            if (!logChannel) return;

            const info = await getMemberInfo(message.guild, message.author);
            const content = parseContent(message);
            try {
                await logChannel.send(`\`\`\`md\n# 📝 ข้อความใหม่\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- ห้อง: #${message.channel.name}\n- เนื้อหา: ${content.slice(0, 1500)}\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });

        client.on('messageDelete', async (message) => {
            if (!message.guild || message.author?.bot) return;
            const logChannel = await getChannel(LOG_CHANNEL_ID, 'บันทึกข้อความลบ');
            if (!logChannel) return;

            const info = message.author ? await getMemberInfo(message.guild, message.author) : { displayName: 'Unknown', name: 'Unknown', id: 'N/A' };
            const content = parseContent(message);
            try {
                await logChannel.send(`\`\`\`md\n# 🗑️ ข้อความถูกลบ\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- ห้อง: #${message.channel.name}\n- ข้อความที่ลบ: ${content.slice(0, 1500)}\n- เวลา: ${getTime()}\n\`\`\``);
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
                await logChannel.send(`\`\`\`md\n# ✏️ ข้อความถูกแก้ไข\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- ห้อง: #${newMessage.channel.name}\n- ข้อความเดิม: ${oldContent.slice(0, 700)}\n- ข้อความใหม่: ${newContent.slice(0, 700)}\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });

        // ----------------------------------------------------
        // 🎮 3. ระบบกิจกรรมผู้ใช้
        // ----------------------------------------------------
        client.on('presenceUpdate', async (oldPresence, newPresence) => {
            if (!newPresence || !newPresence.member || newPresence.user.bot) return;
            if (newPresence.member.roles.cache.size <= 1) return;

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
                    await logChannel.send(`\`\`\`md\n# 🎮 เข้าเล่นเกม\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- เกม: ${newGame.name}${detailsText}\n- เวลา: ${getTime()}\n\`\`\``);
                }
                if (oldGame && newGame && oldGame.name !== newGame.name) {
                    await logChannel.send(`\`\`\`md\n# 🔄 เปลี่ยนเกมที่เล่น\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- จากเกม: ${oldGame.name}\n- ไปเกม: ${newGame.name}\n- เวลา: ${getTime()}\n\`\`\``);
                }

                const oldSpotify = oldPresence?.activities.find(a => a.name === 'Spotify');
                const newSpotify = newPresence.activities.find(a => a.name === 'Spotify');
                if (!oldSpotify && newSpotify) {
                    await logChannel.send(`\`\`\`md\n# 🎵 เริ่มฟังเพลง Spotify\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- เพลง: ${newSpotify.details || 'ไม่ระบุ'}\n- ศิลปิน: ${newSpotify.state || 'ไม่ระบุ'}\n- อัลบั้ม: ${newSpotify.assets?.largeText || 'ไม่ระบุ'}\n- เวลา: ${getTime()}\n\`\`\``);
                }

                const oldStream = oldPresence?.activities.find(a => a.type === 1);
                const newStream = newPresence.activities.find(a => a.type === 1);
                if (!oldStream && newStream) {
                    await logChannel.send(`\`\`\`md\n# 🔴 เริ่มสตรีมสด\n- ชื่อเล่น: ${info.displayName}\n- ชื่อหลัก: ${info.name}\n- User ID: ${info.id}\n- หัวข้อ: ${newStream.details || newStream.name}\n- ลิงก์: ${newStream.url || 'ไม่มี'}\n- เวลา: ${getTime()}\n\`\`\``);
                }
            } catch {}
        });

        // ----------------------------------------------------
        // 🛡️ 4. ระบบการจัดการเซิร์ฟเวอร์ & สมาชิก
        // ----------------------------------------------------
        
        // 📥 สมาชิกเข้าร่วมเซิร์ฟเวอร์
        client.on('guildMemberAdd', async (member) => {
            const logChannel = await getChannel(SERVER_LOG_ID, 'บันทึกเซิร์ฟเวอร์');
            if (!logChannel) return;
            const accountCreated = Math.floor(member.user.createdTimestamp / 1000);
            try {
                await logChannel.send(`\`\`\`md\n# 📥 สมาชิกใหม่เข้าร่วม\n- ชื่อเล่น: ${member.displayName}\n- ชื่อหลัก: ${member.user.tag}\n- User ID: ${member.id}\n- สร้างบัญชีเมื่อ: <t:${accountCreated}:R>\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });

        // 📤 สมาชิกออกจากเซิร์ฟเวอร์
        client.on('guildMemberRemove', async (member) => {
            const logChannel = await getChannel(SERVER_LOG_ID, 'บันทึกเซิร์ฟเวอร์');
            if (!logChannel) return;
            const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'ไม่มี';
            try {
                await logChannel.send(`\`\`\`md\n# 📤 สมาชิกออกจากเซิร์ฟเวอร์\n- ชื่อเล่น: ${member.displayName}\n- ชื่อหลัก: ${member.user.tag}\n- User ID: ${member.id}\n- ยศที่มีก่อนออก: ${roles}\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });

        // ✏️ เปลี่ยนชื่อเล่น & 🛡️ ปรับเปลี่ยนยศ
        client.on('guildMemberUpdate', async (oldMember, newMember) => {
            const logChannel = await getChannel(SERVER_LOG_ID, 'บันทึกเซิร์ฟเวอร์');
            if (!logChannel) return;

            // เปลี่ยนชื่อเล่น
            if (oldMember.nickname !== newMember.nickname) {
                try {
                    await logChannel.send(`\`\`\`md\n# ✏️ เปลี่ยนชื่อเล่น (Nickname)\n- ชื่อหลัก: ${newMember.user.tag}\n- User ID: ${newMember.id}\n- ชื่อเดิม: ${oldMember.nickname || oldMember.user.username}\n- ชื่อใหม่: ${newMember.nickname || newMember.user.username}\n- เวลา: ${getTime()}\n\`\`\``);
                } catch {}
            }

            // เพิ่ม/ลบ ยศ
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

            if (addedRoles.size > 0) {
                const roleNames = addedRoles.map(r => r.name).join(', ');
                try {
                    await logChannel.send(`\`\`\`md\n# 🟢 ได้รับยศใหม่\n- ผู้ใช้: ${newMember.displayName} (${newMember.user.tag})\n- User ID: ${newMember.id}\n- ยศที่ได้รับ: ${roleNames}\n- เวลา: ${getTime()}\n\`\`\``);
                } catch {}
            }
            if (removedRoles.size > 0) {
                const roleNames = removedRoles.map(r => r.name).join(', ');
                try {
                    await logChannel.send(`\`\`\`md\n# 🔴 ถูกถอดจากยศ\n- ผู้ใช้: ${newMember.displayName} (${newMember.user.tag})\n- User ID: ${newMember.id}\n- ยศที่ถูกถอด: ${roleNames}\n- เวลา: ${getTime()}\n\`\`\``);
                } catch {}
            }
        });

        // 📁 สร้าง / ลบ ห้อง
        client.on('channelCreate', async (channel) => {
            if (!channel.guild) return;
            const logChannel = await getChannel(SERVER_LOG_ID, 'บันทึกเซิร์ฟเวอร์');
            if (!logChannel) return;
            try {
                await logChannel.send(`\`\`\`md\n# 📁 สร้างห้องใหม่\n- ชื่อห้อง: #${channel.name}\n- Channel ID: ${channel.id}\n- ประเภท: ${channel.type}\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });

        client.on('channelDelete', async (channel) => {
            if (!channel.guild) return;
            const logChannel = await getChannel(SERVER_LOG_ID, 'บันทึกเซิร์ฟเวอร์');
            if (!logChannel) return;
            try {
                await logChannel.send(`\`\`\`md\n# 🗑️ ห้องถูกลบ\n- ชื่อห้องที่ลบ: #${channel.name}\n- Channel ID: ${channel.id}\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });

        // 🚫 แบน / ปลดแบน สมาชิก
        client.on('guildBanAdd', async (ban) => {
            const logChannel = await getChannel(SERVER_LOG_ID, 'บันทึกเซิร์ฟเวอร์');
            if (!logChannel) return;
            try {
                await logChannel.send(`\`\`\`md\n# 🔨 ถูกแบนจากเซิร์ฟเวอร์\n- ผู้ใช้: ${ban.user.tag}\n- User ID: ${ban.user.id}\n- เหตุผล: ${ban.reason || 'ไม่ได้ระบุ'}\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });

        client.on('guildBanRemove', async (ban) => {
            const logChannel = await getChannel(SERVER_LOG_ID, 'บันทึกเซิร์ฟเวอร์');
            if (!logChannel) return;
            try {
                await logChannel.send(`\`\`\`md\n# 🔓 ถูกปลดแบน\n- ผู้ใช้: ${ban.user.tag}\n- User ID: ${ban.user.id}\n- เวลา: ${getTime()}\n\`\`\``);
            } catch {}
        });
    }
};
