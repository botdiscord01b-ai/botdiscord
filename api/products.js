import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // ตั้งค่า Header ให้แน่ใจว่าตอบกลับเป็น JSON เสมอ แม้จะเกิด Error
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'GET') {
        try {
            let data = await kv.get('yulgang_store_data');
            
            if (!data) {
                data = {
                    products: [
                        { id: 1, name: "หินออฟชั่นพลังโจมตี (ชิ้น)", desc: "หินดรอปจากมอนสเตอร์ระดับสูง สเตตัสสวยพร้อมใช้", amount: 1, price: 35, currency: "บาท", image: "" },
                        { id: 2, name: "คัมภีร์วิชาตัวเบา", desc: "ไอเทมดรอปหายากสำหรับอัปเกรดสกิลเคลื่อนที่", amount: 1, price: 80, currency: "บาท", image: "" },
                        { id: 3, name: "ขยะดรอปสะสม (แพ็ก 100 ชิ้น)", desc: "ไอเทมขยะจากมอนสเตอร์ นำไปขายต่อหรือทำเควสได้คุ้มๆ", amount: 100, price: 20, currency: "บาท", image: "" }
                    ],
                    orders: [],
                    chats: {},
                    logs: [{ time: new Date().toLocaleTimeString('th-TH'), text: "ระบบเริ่มต้นทำงานสำเร็จ" }]
                };
                await kv.set('yulgang_store_data', data);
            }
            return res.status(200).json(data);
        } catch (error) {
            // ส่งค่ากลับเป็น JSON เสมอเพื่อไม่ให้เว็บพัง
            return res.status(500).json({ 
                products: [], 
                orders: [], 
                chats: {}, 
                logs: [{ time: new Date().toLocaleTimeString('th-TH'), text: "DB Error: " + error.message }] 
            });
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

            await kv.set('yulgang_store_data', storeData);
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
