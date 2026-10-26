// ใช้หน่วยความจำกลางบนเซิร์ฟเวอร์โดยไม่ต้องเรียกแพ็กเกจภายนอกให้เกิด Error
let globalStore = {
    products: [],
    orders: [],
    chats: {},
    logs: [
        { time: new Date().toLocaleTimeString('th-TH'), text: "ระบบเซิร์ฟเวอร์เปิดใช้งานสำเร็จ (Stable Mode)" }
    ]
};

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        try {
            return res.status(200).json(globalStore);
        } catch (error) {
            return res.status(200).json(globalStore);
        }
    }

    if (req.method === 'POST') {
        try {
            let bodyData = req.body;
            if (typeof bodyData === 'string') {
                bodyData = JSON.parse(bodyData);
            }

            globalStore = {
                products: Array.isArray(bodyData.products) ? bodyData.products : [],
                orders: Array.isArray(bodyData.orders) ? bodyData.orders : [],
                chats: (bodyData.chats && typeof bodyData.chats === 'object') ? bodyData.chats : {},
                logs: Array.isArray(bodyData.logs) ? bodyData.logs : []
            };

            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
