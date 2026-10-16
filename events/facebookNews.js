const { EmbedBuilder, Events } = require('discord.js');
const RssParser = require('rss-parser');
const parser = new RssParser();

// ID ห้องดิสคอร์ดสำหรับรับข่าวสาร Yulgang Rebuild
const NEWS_CHANNEL_ID = '1560666857818693722'; 

// ลิงก์ RSS Feed จาก RSS.app ของเพจ https://www.facebook.com/ygrebuild
const FB_RSS_URL = 'https://rss.app/feeds/45fCk604cOtqEzuQ.xml'; 

// ตั้งเวลาตรวจสอบโพสต์ใหม่ทุกๆ 5 นาที (5 * 60 * 1000 ms)
const CHECK_INTERVAL = 5 * 60 * 1000; 

// ตัวแปรสำหรับจำ ID / Link ของโพสต์ล่าสุดป้องกันการส่งซ้ำ
let lastPostedGuid = null;

module.exports = {
    name: Events.ClientReady,
    once: false,
    async execute(client) {
        console.log('✅ ระบบติดตามข่าวสาร Facebook (Yulgang Rebuild) เริ่มทำงานแล้ว!');

        const checkFacebookPosts = async () => {
            try {
                const channel = client.channels.cache.get(NEWS_CHANNEL_ID);
                if (!channel) {
                    console.error(`❌ หาห้อง ID ${NEWS_CHANNEL_ID} ไม่พบ กรุณาตรวจสอบสิทธิ์ของบอท`);
                    return;
                }

                // 1. ดึง Feed ล่าสุดจาก RSS URL
                const feed = await parser.parseURL(FB_RSS_URL);
                if (!feed.items || feed.items.length === 0) return;

                // 2. ดึงเฉพาะ "โพสต์ล่าสุด" (ตำแหน่งแรกสุด index 0)
                const latestPost = feed.items[0]; 
                const currentPostGuid = latestPost.guid || latestPost.id || latestPost.link;

                // 3. ระบบเช็กป้องกันการส่งซ้ำ
                if (lastPostedGuid === currentPostGuid) {
                    return; // เป็นโพสต์เดิม ข้ามการทำงาน
                }

                // 4. บันทึก ID โพสต์ล่าสุดไว้ในระบบ
                lastPostedGuid = currentPostGuid;

                // 5. ดึงรูปภาพประกอบโพสต์ (ถ้ามี)
                let imageUrl = null;
                if (latestPost.enclosure && latestPost.enclosure.url) {
                    imageUrl = latestPost.enclosure.url;
                } else if (latestPost.content) {
                    const imgMatch = latestPost.content.match(/src=["'](.*?\.(?:png|jpg|jpeg|gif|webp))["']/i);
                    if (imgMatch) imageUrl = imgMatch[1];
                }

                // 6. ดึงเนื้อหาข้อความในโพสต์
                const rawContent = latestPost.contentSnippet || latestPost.content || 'ไม่มีรายละเอียดข้อความ';
                const cleanContent = rawContent.length > 1800 ? rawContent.substring(0, 1797) + '...' : rawContent;

                // 7. สร้าง Embed
                const embed = new EmbedBuilder()
                    .setTitle(`📢 อัปเดตใหม่จากเพจ Yulgang Rebuild`)
                    .setURL(latestPost.link)
                    .setDescription(cleanContent)
                    .setColor(0x1877F2) // สีน้ำเงิน Facebook
                    .setTimestamp(new Date(latestPost.pubDate || Date.now()))
                    .setFooter({ 
                        text: 'Yulgang Rebuild Facebook Updates', 
                        iconURL: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png' 
                    });

                if (imageUrl) {
                    embed.setImage(imageUrl);
                }

                // 8. ส่งแจ้งเตือนลงห้อง Discord
                await channel.send({ 
                    content: `🔔 **มีประกาศใหม่จากเพจ Yulgang Rebuild!**\n${latestPost.link}`, 
                    embeds: [embed] 
                });

                console.log(`📌 [${new Date().toLocaleTimeString('th-TH')}] ส่งโพสต์ใหม่เข้าห้องเรียบร้อย: ${latestPost.title || 'ประกาศ Yulgang'}`);

            } catch (error) {
                console.error('❌ เกิดข้อผิดพลาดในการเช็กโพสต์ Facebook:', error.message);
            }
        };

        // ตรวจสอบโพสต์ทันทีที่บอทเริ่มทำงาน
        await checkFacebookPosts();

        // ตั้ง Loop ตรวจสอบอัตโนมัติทุกๆ 5 นาที
        setInterval(checkFacebookPosts, CHECK_INTERVAL);
    },
};
