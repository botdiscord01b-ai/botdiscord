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
                            `เลือกรับยศ ${roleName}`
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


            // ตรวจสอบว่ามีไฟล์จริงไหม
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
            // EMBED
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
                        '🎮 เลือกยศที่ต้องการจากเมนูด้านล่าง\n' +
                        '📝 จากนั้นกรอกชื่อที่ต้องการใช้ในเซิร์ฟเวอร์\n' +
                        '🔎 กรอก Steam ID64 เพื่อทำการตรวจสอบ VAC\n\n' +
                        '⚠️ กรุณากรอกข้อมูลให้ถูกต้อง'
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

            console.log(
                '🖼️ ส่ง register.png แล้ว'
            );

            console.log(
                '🎮 ส่งเมนูเลือกยศแล้ว'
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
