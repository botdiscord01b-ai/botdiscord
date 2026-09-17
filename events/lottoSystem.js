const { 
    Events, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const https = require('https');

const LOTTO_CHANNEL_ID = '1549991650862964857'; 

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log('🎰 [Lotto System] ระบบตรวจหวย Native Scraper พร้อมทำงาน!');

        await updateLottoPost(client);

        setInterval(async () => {
            await updateLottoPost(client);
        }, 30 * 60 * 1000);

        client.on(Events.InteractionCreate, async (interaction) => {
            
            if (interaction.isButton() && interaction.customId === 'btn_check_lotto') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_lotto_input')
                    .setTitle('🎰 ตรวจสลากกินแบ่งรัฐบาล');

                const numberInput = new TextInputBuilder()
                    .setCustomId('lotto_number')
                    .setLabel('กรอกเลขสลากกินแบ่ง (6 หลัก)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('เช่น 123456')
                    .setMinLength(6)
                    .setMaxLength(6)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(numberInput));
                await interaction.showModal(modal);
            }

            if (interaction.isModalSubmit() && interaction.customId === 'modal_lotto_input') {
                await interaction.deferReply({ ephemeral: true });

                const userNum = interaction.fields.getTextInputValue('lotto_number');
                const lottoData = await scrapeSanookNative();

                if (!lottoData) {
                    return interaction.editReply({ content: '❌ ไม่สามารถดึงข้อมูลผลสลากได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
                }

                let wonPrizes = [];

                if (userNum === lottoData.prize1) {
                    wonPrizes.push('รางวัลที่ 1 (เงินรางวัล 6,000,000 บาท)');
                }

                lottoData.front3.forEach(num => {
                    if (userNum.startsWith(num)) {
                        wonPrizes.push(`เลขหน้า 3 ตัว [เลข ${num}] (เงินรางวัล 4,000 บาท)`);
                    }
                });

                lottoData.rear3.forEach(num => {
                    if (userNum.endsWith(num)) {
                        wonPrizes.push(`เลขท้าย 3 ตัว [เลข ${num}] (เงินรางวัล 4,000 บาท)`);
                    }
                });

                if (userNum.endsWith(lottoData.rear2)) {
                    wonPrizes.push(`เลขท้าย 2 ตัว [เลข ${lottoData.rear2}] (เงินรางวัล 2,000 บาท)`);
                }

                const resultEmbed = new EmbedBuilder().setTimestamp();

                if (wonPrizes.length > 0) {
                    resultEmbed
                        .setColor('#00FF00')
                        .setTitle(`🎉 ยินดีด้วยครับ! คุณถูกรางวัล 🎉`)
                        .setDescription(`หมายเลขสลาก: **${userNum}**\nประจำงวดวันที่: **${lottoData.date}**\n\n` + wonPrizes.map(w => `✅ **${w}**`).join('\n'))
                        .setFooter({ text: 'ขอให้โชคดีในงวดถัดๆ ไปครับ!' });
                } else {
                    resultEmbed
                        .setColor('#FF0000')
                        .setTitle(`เสียใจด้วยครับ คุณไม่ถูกรางวัล 😭`)
                        .setDescription(`หมายเลขสลาก: **${userNum}**\nประจำงวดวันที่: **${lottoData.date}**\n\n*ไม่พบรางวัลในงวดนี้ งวดหน้าเอาใหม่ครับ!*`);
                }

                try {
                    await interaction.user.send({ embeds: [resultEmbed] });
                    await interaction.editReply({ content: '📩 บอทส่งผลตรวจสลากไปทาง **ข้อความส่วนตัว (DM)** เรียบร้อยแล้วครับ!' });
                } catch (dmErr) {
                    await interaction.editReply({ 
                        content: '⚠️ คุณปิด DM บอทจึงส่งผลตรวจให้ที่นี่แทนครับ:', 
                        embeds: [resultEmbed] 
                    });
                }
            }
        });
    }
};

function scrapeSanookNative() {
    return new Promise((resolve) => {
        const options = {
            hostname: 'news.sanook.com',
            path: '/lotto/',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            }
        };

        https.get(options, (res) => {
            let html = '';
            res.on('data', chunk => html += chunk);
            res.on('end', () => {
                try {
                    const dateMatch = html.match(/class="lotto-check__title"[^>]*>([\s\S]*?)<\/strong>/i);
                    let dateStr = 'งวดล่าสุด';
                    if (dateMatch && dateMatch[1]) {
                        dateStr = dateMatch[1].replace(/<[^>]+>/g, '').replace('ผลสลากกินแบ่งรัฐบาล', '').trim();
                    }

                    const numberRegex = /class="lotto-check__number"[^>]*>([\s\S]*?)<\/strong>/g;
                    const numbers = [];
                    let match;

                    while ((match = numberRegex.exec(html)) !== null) {
                        const num = match[1].replace(/<[^>]+>/g, '').trim();
                        if (num) numbers.push(num);
                    }

                    if (numbers.length >= 6) {
                        resolve({
                            date: dateStr,
                            prize1: numbers[0] || '------',
                            front3: [numbers[1], numbers[2]],
                            rear3: [numbers[3], numbers[4]],
                            rear2: numbers[5] || '--'
                        });
                    } else {
                        resolve(null);
                    }
                } catch (err) {
                    console.error('❌ [Parse Error]:', err.message);
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.error('❌ [Request Error]:', err.message);
            resolve(null);
        });
    });
}

async function updateLottoPost(client) {
    try {
        const channel = await client.channels.fetch(LOTTO_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const lotto = await scrapeSanookNative();

        const dateStr = lotto ? lotto.date : 'ล่าสุด';
        const prize1 = lotto ? lotto.prize1 : '------';
        const front3 = lotto ? lotto.front3.join('  ') : '--- ---';
        const rear3 = lotto ? lotto.rear3.join('  ') : '--- ---';
        const rear2 = lotto ? lotto.rear2 : '--';

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`🎰 ผลสลากกินแบ่งรัฐบาล ${dateStr}`)
            .setDescription('กดปุ่มด้านล่างเพื่อพิมพ์กรอกเลขสลาก ผลการตรวจจะถูกส่งเข้า Inbox ส่วนตัวของคุณทันที!')
            .addFields(
                { name: '🥇 รางวัลที่ 1', value: `\`\`\`text\n${prize1}\n\`\`\``, inline: false },
                { name: '🔹 เลขหน้า 3 ตัว', value: `\`\`\`text\n${front3}\n\`\`\``, inline: true },
                { name: '🔹 เลขท้าย 3 ตัว', value: `\`\`\`text\n${rear3}\n\`\`\``, inline: true },
                { name: '🔴 เลขท้าย 2 ตัว', value: `\`\`\`text\n${rear2}\n\`\`\``, inline: true }
            )
            .setFooter({ text: 'ระบบตรวจหวยอัตโนมัติ', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('btn_check_lotto')
                .setLabel('🔍 กรอกเลขตรวจหวย (ส่งผลเข้า DM)')
                .setStyle(ButtonStyle.Success)
        );

        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessage = messages ? messages.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.includes('ผลสลากกินแบ่งรัฐบาล')) : null;

        if (botMessage) {
            await botMessage.edit({ embeds: [embed], components: [row] });
        } else {
            await channel.send({ embeds: [embed], components: [row] });
        }

    } catch (error) {
        console.error('❌ [Lotto Post Error]:', error.message);
    }
}
