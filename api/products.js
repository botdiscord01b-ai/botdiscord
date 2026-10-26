import { kv } from '@vercel/kv';

const STORE_KEY = 'masaru_shop_permanent_data';

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        try {
            let data = await kv.get(STORE_KEY);
            
            if (!data) {
                data = {
                    products: [],
                    orders: [],
                    chats: {},
                    logs: [{ time: new Date().toLocaleTimeString('th-TH'), text: "ระบบฐานข้อมูล Upstash KV พร้อมใช้งาน" }]
                };
                await kv.set(STORE_KEY, data);
            }
            return res.status(200).json(data);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'POST') {
        try {
            let bodyData = req.body;
            if (typeof bodyData === 'string') {
                bodyData = JSON.parse(bodyData);
            }

            const storeData = {
                products: bodyData.products || [],
                orders: bodyData.orders || [],
                chats: bodyData.chats || {},
                logs: bodyData.logs || []
            };

            // บันทึกข้อมูลลง Upstash KV ถาวร
            await kv.set(STORE_KEY, storeData);
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
