import { kv } from '@vercel/kv';

const STORE_KEY = 'masaru_shop_permanent_data';

export default async function handler(req, res) {
    // กำหนดให้ตอบกลับเป็น JSON เสมอเพื่อป้องกันหน้าเว็บพัง
    res.setHeader('Content-Type', 'application/json');

    // CORS Headers เพื่อความปลอดภัยและความยืดหยุ่นในการเรียกใช้งาน
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // โครงสร้างข้อมูลเริ่มต้นมาตรฐาน
    const defaultStore = {
        products: [],
        orders: [],
        chats: {},
        logs: [
            { time: new Date().toLocaleTimeString('th-TH'), text: "ระบบเซิร์ฟเวอร์เริ่มต้นทำงานอย่างสมบูรณ์" }
        ]
    };

    if (req.method === 'GET') {
        try {
            let data = await kv.get(STORE_KEY);
            
            if (!data || typeof data !== 'object') {
                data = defaultStore;
                await kv.set(STORE_KEY, data);
            }

            return res.status(200).json({
                products: Array.isArray(data.products) ? data.products : [],
                orders: Array.isArray(data.orders) ? data.orders : [],
                chats: (data.chats && typeof data.chats === 'object') ? data.chats : {},
                logs: Array.isArray(data.logs) ? data.logs : []
            });

        } catch (error) {
            console.error("GET Error:", error);
            // ส่งข้อมูลสำรองกลับไปทันทีหาก KV ขัดข้อง เพื่อไม่ให้หน้าเว็บสะดุด
            return res.status(200).json({
                ...defaultStore,
                logs: [{ time: new Date().toLocaleTimeString('th-TH'), text: `Warning: ${error.message}` }]
            });
        }
    }

    if (req.method === 'POST') {
        try {
            let bodyData = req.body;
            if (typeof bodyData === 'string') {
                bodyData = JSON.parse(bodyData);
            }

            // ตรวจสอบความถูกต้องของข้อมูลก่อนบันทึก (Validation)
            const sanitizedData = {
                products: Array.isArray(bodyData.products) ? bodyData.products : [],
                orders: Array.isArray(bodyData.orders) ? bodyData.orders : [],
                chats: (bodyData.chats && typeof bodyData.chats === 'object') ? bodyData.chats : {},
                logs: Array.isArray(bodyData.logs) ? bodyData.logs : []
            };

            // บันทึกลง Upstash KV
            await kv.set(STORE_KEY, sanitizedData);

            return res.status(200).json({ success: true, message: "Data saved successfully" });

        } catch (error) {
            console.error("POST Error:", error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
