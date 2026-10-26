const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const STORE_KEY = 'masaru_shop_permanent_data';

// ฟังก์ชันช่วยยิงข้อมูลไปยัง Upstash REST API โดยไม่พึ่งไลบรารีภายนอก
async function kvFetch(command, ...args) {
    if (!KV_URL || !KV_TOKEN) return null;
    try {
        const response = await fetch(`${KV_URL}/${command}/${args.map(encodeURIComponent).join('/')}`, {
            headers: { Authorization: `Bearer ${KV_TOKEN}` }
        });
        const data = await response.json();
        return data.result;
    } catch (err) {
        console.error("Upstash Fetch Error:", err);
        return null;
    }
}

let fallbackMemory = {
    products: [],
    orders: [],
    chats: {},
    logs: [{ time: new Date().toLocaleTimeString('th-TH'), text: "ระบบเปิดใช้งานโหมด HTTP REST API" }]
};

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET') {
        try {
            let data = await kvFetch('get', STORE_KEY);
            if (data && typeof data === 'string') {
                data = JSON.parse(data);
            }
            if (!data) {
                data = fallbackMemory;
                await kvFetch('set', STORE_KEY, JSON.stringify(data));
            }
            return res.status(200).json(data);
        } catch (error) {
            return res.status(200).json(fallbackMemory);
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

            await kvFetch('set', STORE_KEY, JSON.stringify(storeData));
            fallbackMemory = storeData;

            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
