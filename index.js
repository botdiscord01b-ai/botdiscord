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
// CLIENT (เพิ่ม GuildPresences สำหรับจับกิจกรรมเล่นเกม)
// =========================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences // <--- เพิ่มตัวนี้เพื่อจับสถานะเข้า/เลิกเล่นเกม
    ]
});


// =========================================================
// COMMANDS
// =========================================================
client.commands = new Collection();

const commandsArray = [];

const commandsPath = path.join(
    __dirname,
    'commands'
);

if (fs.existsSync(commandsPath)) {

    const items = fs.readdirSync(commandsPath);

    for (const item of items) {

        const itemPath = path.join(
            commandsPath,
            item
        );

        const stat = fs.statSync(itemPath);

        // -------------------------------
        // โฟลเดอร์ย่อย
        // -------------------------------
        if (stat.isDirectory()) {

            const subFiles =
                fs.readdirSync(itemPath)
                    .filter(file =>
                        file.endsWith('.js')
                    );

            for (const file of subFiles) {

                const filePath =
                    path.join(
                        itemPath,
                        file
                    );

                const command =
                    require(filePath);

                if (
                    'data' in command &&
                    'execute' in command
                ) {

                    client.commands.set(
                        command.data.name,
                        command
                    );

                    commandsArray.push(
                        command.data.toJSON()
                    );
                }
            }

        // -------------------------------
        // ไฟล์ command ปกติ
        // -------------------------------
        } else if (
            item.endsWith('.js')
        ) {

            const command =
                require(itemPath);

            if (
                'data' in command &&
                'execute' in command
            ) {

                client.commands.set(
                    command.data.name,
                    command
                );

                commandsArray.push(
                    command.data.toJSON()
                );
            }
        }
    }
}


// =========================================================
// EVENTS
// =========================================================
const eventsPath = path.join(
    __dirname,
    'events'
);

if (fs.existsSync(eventsPath)) {

    const eventItems =
        fs.readdirSync(eventsPath);

    for (const item of eventItems) {

        const itemPath =
            path.join(
                eventsPath,
                item
            );

        const stat =
            fs.statSync(itemPath);

        // -------------------------------
        // Event ในโฟลเดอร์ย่อย
        // -------------------------------
        if (stat.isDirectory()) {

            const subEventFiles =
                fs.readdirSync(itemPath)
                    .filter(file =>
                        file.endsWith('.js')
                    );

            for (
                const file of subEventFiles
            ) {

                const filePath =
                    path.join(
                        itemPath,
                        file
                    );

                const event =
                    require(filePath);

                if (event.once) {

                    client.once(
                        event.name,
                        (...args) =>
                            event.execute(...args)
                    );

                } else {

                    client.on(
                        event.name,
                        (...args) =>
                            event.execute(...args)
                    );
                }
            }

        // -------------------------------
        // Event ปกติ
        // -------------------------------
        } else if (
            item.endsWith('.js')
        ) {

            const event =
                require(itemPath);

            if (event.once) {

                client.once(
                    event.name,
                    (...args) =>
                        event.execute(...args)
                );

            } else {

                client.on(
                    event.name,
                    (...args) =>
                        event.execute(...args)
                );
            }
        }
    }
}


// =========================================================
// BOT READY
// =========================================================
client.once(
    Events.ClientReady,
    async () => {

        console.log(
            `✅ Logged in as ${client.user.tag}!`
        );

        // =====================================================
        // REGISTER SLASH COMMANDS
        // =====================================================
        try {

            console.log(
                `🔄 กำลังลงทะเบียนคำสั่ง ${commandsArray.length} คำสั่ง...`
            );

            const rest =
                new REST({
                    version: '10'
                }).setToken(
                    process.env.BOT_TOKEN
                );

            await rest.put(
                Routes.applicationGuildCommands(
                    process.env.CLIENT_ID,
                    process.env.GUILD_ID
                ),
                {
                    body: commandsArray
                }
            );

            console.log(
                '✅ ลงทะเบียนคำสั่งสำเร็จเรียบร้อย!'
            );

        } catch (error) {

            console.error(
                '❌ เกิดข้อผิดพลาดในการลงทะเบียนคำสั่ง:',
                error
            );
        }

        // =====================================================
        // ระบบตรวจเช็กและถอดยศชั่วคราวตกค้างทุก 1 ชั่วโมง
        // =====================================================
        const checkTempRoles = async () => {
            try {
                for (const [, guild] of client.guilds.cache) {
                    const tempRole = guild.roles.cache.get(TEMP_ROLE_ID);
                    if (!tempRole) continue;

                    const members = await guild.members.fetch();
                    for (const [, member] of members) {
                        if (member.roles.cache.has(TEMP_ROLE_ID)) {
                            // เช็กระยะเวลาเข้าร่วมหรือรับยศคร่าวๆ
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

        // =====================================================
        // ห้องลงทะเบียน
        // =====================================================
        const targetChannelId =
            '1486030638464237631';

        try {

            const channel =
                await client.channels.fetch(
                    targetChannelId
                );

            if (!channel) {

                console.error(
                    '❌ ไม่พบห้องลงทะเบียน'
                );

                return;
            }

            // =================================================
            // ดึงข้อความเก่า
            // =================================================
            const messages =
                await channel.messages.fetch({
                    limit: 50
                });

            // =================================================
            // ลบข้อความเก่าของบอท
            // =================================================
            for (
                const msg of messages.values()
            ) {

                if (
                    msg.author.id ===
                    client.user.id
                ) {

                    try {

                        await msg.delete();

                        console.log(
                            '🗑️ ลบข้อความลงทะเบียนเก่าแล้ว'
                        );

                    } catch (error) {

                        console.log(
                            '⚠️ ลบข้อความเก่าไม่ได้:',
                            error.message
                        );
                    }
                }
            }

            // =================================================
            // GUILD
            // =================================================
            const guild =
                channel.guild;

            // =================================================
            // ROLE IDS
            // =================================================
            const roleIds = [
                '1356148472851726437',
                '1538468356049477664',
                '1462774552726606017'
            ];

            const emojis = [
                '🎮',
                '🔥',
                '🏆'
            ];

            const options = [];

            // =================================================
            // สร้างรายการยศ
            // =================================================
            for (
                let i = 0;
                i < roleIds.length;
                i++
            ) {

                const roleId =
                    roleIds[i];

                const role =
                    guild.roles.cache.get(
                        roleId
                    );

                const roleName =
                    role
                        ? role.name
                        : `ยศ (${roleId})`;

                options.push(

                    new StringSelectMenuOptionBuilder()

                        .setLabel(
                            roleName
                        )

                        .setDescription(
                            `เลือกรับยศ ${roleName} (พร้อมรับยศชั่วคราว 1 วัน)`
                        )

                        .setValue(
                            roleId
                        )

                        .setEmoji(
                            emojis[i] || '⭐'
                        )
                );
            }

            // =================================================
            // SELECT MENU
            // =================================================
            const selectMenu =
                new StringSelectMenuBuilder()

                    .setCustomId(
                        'select_role_menu'
                    )

                    .setPlaceholder(
                        '📌 กรุณาเลือกยศที่ต้องการรับที่นี่...'
                    )

                    .addOptions(
                        options
                    );

            const row =
                new ActionRowBuilder()
                    .addComponents(
                        selectMenu
                    );

            // =================================================
            // REGISTER.PNG
            // =================================================
            const imagePath =
                path.join(
                    __dirname,
                    'register.png'
                );

            if (
                !fs.existsSync(imagePath)
            ) {

                console.error(
                    '❌ ไม่พบไฟล์ register.png'
                );

                console.error(
                    `📁 ต้องวางไฟล์ไว้ที่: ${imagePath}`
                );

                return;
            }

            console.log(
                `✅ พบ register.png: ${imagePath}`
            );

            // =================================================
            // ATTACHMENT
            // =================================================
            const attachment =
                new AttachmentBuilder(
                    imagePath,
                    {
                        name: 'register.png'
                    }
                );

            // =================================================
            // EMBED (อัปเดตข้อความแนะนำเรื่องยศชั่วคราวเรียบร้อย)
            // =================================================
            const embed =
                new EmbedBuilder()

                    .setColor(
                        '#9B59B6'
                    )

                    .setTitle(
                        '📌 ระบบเลือกยศและลงทะเบียนเซิร์ฟเวอร์'
                    )

                    .setDescription(
                        'ยินดีต้อนรับเข้าสู่ระบบลงทะเบียนรับยศ\n\n' +
                        '🎮 **ขั้นตอนการลงทะเบียน:**\n' +
                        '1️⃣ เลือกยศที่ต้องการจากเมนูด้านล่าง\n' +
                        '2️⃣ กรอกชื่อที่ต้องการใช้ในเซิร์ฟเวอร์\n' +
                        '3️⃣ กรอก Steam ID64 เพื่อทำการตรวจสอบ VAC\n\n' +
                        '⏰ **สิทธิพิเศษเพิ่มเติม:**\n' +
                        `เมื่อลงทะเบียนสำเร็จ คุณจะได้รับยศชั่วคราว **<@&${TEMP_ROLE_ID}>** เพิ่มเติมทันที!\n` +
                        '*(ยศชั่วคราวนี้จะมีอายุการใช้งาน **24 ชั่วโมง (1 วัน)** และจะถูกถอดออกอัตโนมัติ)*\n\n' +
                        '⚠️ *กรุณากรอกข้อมูลให้ถูกต้องเพื่อผลประโยชน์ของตัวท่านเอง*'
                    )

                    .setImage(
                        'attachment://register.png'
                    )

                    .setFooter({
                        text:
                            'ระบบลงทะเบียนอัตโนมัติ'
                    });

            // =================================================
            // ส่งรูป + Embed + Menu
            // =================================================
            await channel.send({

                embeds: [
                    embed
                ],

                files: [
                    attachment
                ],

                components: [
                    row
                ]
            });

            console.log(
                '✅ สร้างห้องลงทะเบียนอัตโนมัติสำเร็จ!'
            );

        } catch (error) {

            console.error(
                '❌ เกิดข้อผิดพลาดในการสร้างระบบลงทะเบียน:',
                error
            );
        }
    }
);

// =========================================================
// LOGIN
// =========================================================
client.login(
    process.env.BOT_TOKEN
);
