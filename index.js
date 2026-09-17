const {
    Client,
    GatewayIntentBits,
    Collection,
    REST,
    Routes,
    Events,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// =========================================================
// CONSTANTS (ยศชั่วคราว)
// =========================================================
const TEMP_ROLE_ID = '1550062346435567657';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// =========================================================
// CLIENT
// =========================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences
    ]
});

// =========================================================
// COMMANDS LOADER
// =========================================================
client.commands = new Collection();
const commandsArray = [];
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

// =========================================================
// EVENTS LOADER
// =========================================================
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

// =========================================================
// BOT READY
// =========================================================
client.once(Events.ClientReady, async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);

    // --- REGISTER SLASH COMMANDS ---
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

    // --- AUTO CHECK TEMP ROLES (ถอดยศตกค้างทุก 1 ชม.) ---
    const checkTempRoles = async () => {
        try {
            for (const [, guild] of client.guilds.cache) {
                const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);
                if (!tempRole) continue;

                const members = await guild.members.fetch();
                for (const [, member] of members) {
                    if (member.roles.cache.has(TEMP_ROLE_ID)) {
                        const joinedTime = member.joinedTimestamp;
                        if (Date.now() - joinedTime > ONE_DAY_MS) {
                            await member.roles.remove(TEMP_ROLE_ID).catch(() => null);
                            console.log(`⏰ [Auto Check] ถอดยศชั่วคราวจาก ${member.user.tag} เรียบร้อยแล้ว`);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('❌ เกิดข้อผิดพลาดในการสแกนยศชั่วคราว:', err);
        }
    };
    checkTempRoles();
    setInterval(checkTempRoles, 60 * 60 * 1000);

    // --- SETUP ROOM MESSAGES ---
    const targetChannelId = '1486030638464237631';
    try {
        const channel = await client.channels.fetch(targetChannelId);
        if (!channel) return console.error('❌ ไม่พบห้องลงทะเบียน');

        const messages = await channel.messages.fetch({ limit: 50 });
        for (const msg of messages.values()) {
            if (msg.author.id === client.user.id) {
                await msg.delete().catch(() => null);
            }
        }

        const guild = channel.guild;
        const roleIds = [
            '1356148472851726437',
            '1538468356049477664',
            '1462774552726606017'
        ];
        const emojis = ['🎮', '🔥', '🏆'];
        const options = [];

        // 1. เพิ่มยศถาวร
        for (let i = 0; i < roleIds.length; i++) {
            const roleId = roleIds[i];
            const role = guild.roles.cache.get(roleId);
            const roleName = role ? role.name : `ยศ (${roleId})`;

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`[ถาวร] ${roleName}`)
                    .setDescription(`รับยศถาวร ${roleName} (ต้องกรอก Steam ID64)`)
                    .setValue(`perm_${roleId}`)
                    .setEmoji(emojis[i] || '⭐')
            );
        }

        // 2. เพิ่มยศชั่วคราว
        const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);
        const tempRoleName = tempRole ? tempRole.name : 'ยศชั่วคราว (1 วัน)';
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(`[ชั่วคราว 1 วัน] ${tempRoleName}`)
                .setDescription('รับยศทดลองใช้งาน 24 ชม. (ไม่ต้องกรอก Steam ID)')
                .setValue('temp_role_only')
                .setEmoji('⏰')
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_role_menu')
            .setPlaceholder('📌 กรุณาเลือกยศที่ต้องการรับที่นี่...')
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        const imagePath = path.join(__dirname, 'register.png');
        if (!fs.existsSync(imagePath)) return console.error(`❌ ไม่พบไฟล์ register.png ที่: ${imagePath}`);

        const attachment = new AttachmentBuilder(imagePath, { name: 'register.png' });

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('📌 ระบบเลือกยศและลงทะเบียนเซิร์ฟเวอร์')
            .setDescription(
                'ยินดีต้อนรับเข้าสู่ระบบลงทะเบียนรับยศ\n\n' +
                '🔰 **ข้อแตกต่างประเภทการรับยศ:**\n' +
                '▪️ **ยศถาวร:** ต้องกรอกชื่อดิสคอร์ด + Steam ID64 (ตรวจ VAC Ban)\n' +
                '▪️ **ยศชั่วคราว (1 วัน):** กรอกเฉพาะชื่อดิสคอร์ด (ไม่ต้องกรอก Steam ID)\n\n' +
                '🎮 **วิธีใช้งาน:** เลือกยศที่ต้องการจากเมนูด้านล่างแล้วกรอกข้อมูลตามที่ระบบร้องขอ'
            )
            .setImage('attachment://register.png')
            .setFooter({ text: 'ระบบลงทะเบียนอัตโนมัติ' });

        await channel.send({
            embeds: [embed],
            files: [attachment],
            components: [row]
        });

        console.log('✅ สร้างห้องลงทะเบียนอัตโนมัติสำเร็จ!');

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการสร้างระบบลงทะเบียน:', error);
    }
});

client.login(process.env.BOT_TOKEN);
