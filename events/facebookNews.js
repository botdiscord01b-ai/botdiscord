const { EmbedBuilder } = require('discord.js');
const RssParser = require('rss-parser');
const parser = new RssParser();

// ตั้งค่าไอดีห้องดิสคอร์ด และ RSS Feed URL สำหรับเพจ https://www.facebook.com/ygrebuild
const NEWS_CHANNEL_ID = '1560666857818693722'; 

// ลิงก์ RSS Feed จากบริการ RSS.app (แปลงมาจากเพจ https://www.facebook.com/ygrebuild)
const FB_RSS_URL = 'https://rss.app/feeds/ygrebuild.xml'; // นำ RSS Feed URL ที่สร้างได้มาใส่ที่นี่

const CHECK_INTERVAL = 5 * 60 * 1000; // ตรวจสอบโพสต์ใหม่ทุกๆ 5 นาที

let lastPostId = null;

module.exports = {
    name: 'ready',
    once: false,
    async execute(client) {
        console.log('✅ ระบบติดตามเพจ Yulgang Rebuild เริ่มทำงานแล้ว!');

        const checkFacebookPosts = async () => {
            try {
                const channel = client.channels.cache.get(NEWS_CHANNEL_ID);
                if (!channel) {
                    console.error(`❌ หาห้อง ID ${NEWS_CHANNEL_ID} ไม่เจอ กรุณาตรวจสอบสิทธิ์ของบอท`);
                    return;
                }

                // ดึงข้อมูล Feed ล่าสุดจาก Facebook RSS
                const feed = await parser.parseURL(FB_RSS_URL);
                if (!feed.items || feed.items.length === 0) return;

                const latestPost = feed.items[0]; // ดึงโพสต์ล่าสุด

                // ถ้าเป็นโพสต์เดิมที่เคยส่งไปแล้ว ให้ข้าม
                if (lastPostId === latestPost.id || lastPostId === latestPost.link) {
                    return;
                }

                // บันทึก ID โพสต์ล่าสุด
                lastPostId = latestPost.id || latestPost.link;

                // ดึงรูปภาพจากเนื้อหาโพสต์ (ถ้ามี)
                let imageUrl = null;
                if (latestPost.enclosure && latestPost.enclosure.url) {
                    imageUrl = latestPost.enclosure.url;
                } else if (latestPost.content) {
                    const imgMatch = latestPost.content.match(/src=["'](.*?\.(?:png|jpg|jpeg|gif|webp))["']/i);
                    if (imgMatch) imageUrl = imgMatch[1];
                }

                // ตัดความยาวข้อความให้อยู่ในสเปกของ Embed
                const cleanContent = latestPost.contentSnippet || latestPost.content || 'ไม่มีรายละเอียดข้อความ';
                const shortDesc = cleanContent.length > 1000 ? cleanContent.substring(0, 997) + '...' : cleanContent;

                // สร้าง Embed แสดงผลข้อความ ลิงก์ และรูปภาพ
                const embed = new EmbedBuilder()
                    .setTitle(`📢 อัปเดตใหม่จากเพจ Yulgang Rebuild`)
                    .setURL(latestPost.link)
                    .setDescription(shortDesc)
                    .setColor(0x1877F2) // สีน้ำเงิน Facebook
                    .setTimestamp(new Date(latestPost.pubDate || Date.now()))
                    .setFooter({ 
                        text: 'Yulgang Rebuild Facebook Updates', 
                        iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png' 
                    });

                if (imageUrl) {
                    embed.setImage(imageUrl);
                }

                // ส่งเข้าห้อง Discord
                await channel.send({ content: `🔔 **มีประกาศใหม่จากเพจ Yulgang Rebuild!**\n${latestPost.link}`, embeds: [embed] });
                console.log(`📌 โพสต์อัปเดตจากเพจ Yulgang Rebuild เรียบร้อยแล้ว!`);

            } catch (error) {
                console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลเพจ Yulgang Rebuild:', error.message);
            }
        };

        // รันครั้งแรกทันทีตอนบอทออนไลน์
        await checkFacebookPosts();

        // ตั้งเวลาตรวจสอบอัตโนมัติทุกๆ 5 นาที
        setInterval(checkFacebookPosts, CHECK_INTERVAL);
    },
};
