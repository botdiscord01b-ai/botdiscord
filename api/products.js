import { kv } from '@vercel/kv';

// ข้อมูลสำรองกรณีฐานข้อมูลยังไม่เชื่อมต่อ
let fallbackStore = {
    products: [
        { id: 1, name: "หินออฟชั่นพลังโจมตี (ชิ้น)", desc: "หินดรอปจากมอนสเตอร์ระดับสูง สเตตัสสวยพร้อมใช้", amount: 1, price: 35, currency: "บาท", image: "" },
        { id: 2, name: "คัมภีร์วิชาตัวเบา", desc: "ไอเทมดรอปหายากสำหรับอัปเกรดสกิลเคลื่อนที่", amount: 1, price: 80, currency: "บาท", image: "" },
        { id: 3, name: "ขยะดรอปสะสม (แพ็ก 100 ชิ้น)", desc: "ไอเทมขยะจากมอนสเตอร์ นำไปขายต่อหรือทำเควสได้คุ้มๆ", amount: 100, price: 20, currency: "บาท", image: "" }
    ],
    orders: [],
    chats: {},
    logs: [{ time: new Date().toLocaleTimeString('th-TH'), text: "ระบบเปิดใช้งานโหมดสำรอง (Fallback Mode)" }]
};

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        try {
            let data = await kv.get('yulgang_store_data');
            if (!data) {
                data = fallbackStore;
                await kv.set('yulgang_store_data', data);
            }
            return res.status(200).json(data);
        } catch (error) {
            // หากต่อ KV ไม่ได้ ให้คืนค่าข้อมูลสำรองทันที ไม่ให้เว็บพัง
            return res.status(200).json(fallbackStore);
        }
    }

    if (req.method === 'POST') {
        try {
            let bodyData = req.body;
            if (typeof bodyData === 'string') {
                bodyData = JSON.parse(bodyData);
            }

            const storeData = {
                products: bodyData.products || fallbackStore.products,
                orders: bodyData.orders || [],
                chats: bodyData.chats || {},
                logs: bodyData.logs || []
            };

            try {
                await kv.set('yulgang_store_data', storeData);
            } catch (kvErr) {
                console.error("KV save error, using fallback memory", kvErr);
                fallbackStore = storeData; // เก็บไว้ในหน่วยความจำชั่วคราวถ้า KV มีปัญหา
            }

            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
