const { Client, GatewayIntentBits, Collection, REST, Routes, Events, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,      // จำเป็นสำหรับการอ่านข้อความ
        GatewayIntentBits.MessageContent,     // จำเป็นสำหรับการอ่านเนื้อหาในข้อความ
        GatewayIntentBits.GuildMembers,       // จำเป็นสำหรับระบบสมาชิกเข้า-ออก
        GatewayIntentBits.GuildVoiceStates,   // จำเป็นสำหรับระบบ Log ห้องเสียง
        GatewayIntentBits.DirectMessages
    ]
});

// สร้าง Collection สำหรับเก็บ Slash Commands
client.commands = new Collection();
const commandsArray = [];

// โหลดคำสั่ง Slash Commands แบบครอบคลุม (รองรับทั้งไฟล์ตรงและโฟลเดอร์ย่อย)
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const items = fs.readdirSync(commandsPath);

    for (const item of items) {
        const itemPath = path.join(commandsPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            const subFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
            for (const file of subFiles) {
                const filePath = path.join(itemPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    commandsArray.push(command.data.toJSON());
                }
            }
        } else if (item.endsWith('.js')) {
            const command = require(itemPath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commandsArray.push(command.data.toJSON());
            }
        }
    }
}

// โหลด Events อัตโนมัติจากโฟลเดอร์ events (รองรับทั้งไฟล์ตรงและโฟลเดอร์ย่อย)
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventItems = fs.readdirSync(eventsPath);

    for (const item of eventItems) {
        const itemPath = path.join(eventsPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            const subEventFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
            for (const file of subEventFiles) {
                const filePath = path.join(itemPath, file);
                const event = require(filePath);
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args));
                } else {
                    client.on(event.name, (...args) => event.execute(...args));
                }
            }
        } else if (item.endsWith('.js')) {
            const event = require(itemPath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
        }
    }
}

// แจ้งเตือนเมื่อบอทพร้อมใช้งาน และทำการลงทะเบียน Slash Commands อัตโนมัติ พร้อมระบบดึงชื่อยศจริงตาม ID
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        console.log(`🔄 กำลังลงทะเบียนคำสั่ง ${commandsArray.length} คำสั่ง...`);
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commandsArray }
        );

        console.log('✅ ลงทะเบียนคำสั่งสำเร็จเรียบร้อย!');
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการลงทะเบียนคำสั่ง:', error);
    }

    // ระบบเคลียร์เมนูเก่าและดึงชื่อยศจริงมาสร้างเมนูใหม่ในห้อง 1486030638464237631 อัตโนมัติเมื่อรีสตาร์ท
    const targetChannelId = '1486030638464237631';
    try {
        const channel = await client.channels.fetch(targetChannelId);
        if (channel) {
            const messages = await channel.messages.fetch({ limit: 10 });
            for (const msg of messages.values()) {
                if (msg.author.id === client.user.id) {
                    await msg.delete().catch(() => {});
                }
            }

            const guild = channel.guild;

            // รายการ ID ยศทั้ง 3 อันของคุณ
            const roleIds = [
                '1356148472851726437',
                '1538468356049477664',
                '1462774552726606017'
            ];

            const options = [];
            const emojis = ['🎮', '🔥', '🏆']; // กำหนดไอคอนเรียงตามยศ

            for (let i = 0; i < roleIds.length; i++) {
                const roleId = roleIds[i];
                const role = guild.roles.cache.get(roleId);
                const roleName = role ? role.name : `ยศ (${roleId})`; // ถ้าหาไม่เจอจะแสดง ID กันพัง

                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(roleName) // ดึงชื่อจริงจากเซิร์ฟเวอร์มาแสดงทันที
                        .setDescription(`เลือกรับยศ ${roleName}`)
                        .setValue(roleId)
                        .setEmoji(emojis[i] || '⭐')
                );
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_role_menu')
                .setPlaceholder('📌 กรุณาเลือกยศที่ต้องการรับที่นี่...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await channel.send({
                content: '📌 **ระบบเลือกยศและลงทะเบียนเซิร์ฟเวอร์**\nกรุณาเลือกยศจากเมนูด้านล่าง จากนั้นกรอกข้อมูลเพื่อรับยศและตรวจสอบ VAC ได้เลยครับ!',
                components: [row],
            });

            console.log('✅ รีเฟรชลบเมนูเก่าและส่งเมนูเลือกยศ (ดึงชื่อจริงตาม ID) เรียบร้อยแล้ว');
        }
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการจัดการเมนูเลือกยศออโต้:', error);
    }
});

// ล็อกอินเข้าสู่ระบบ Discord
client.login(process.env.BOT_TOKEN);
