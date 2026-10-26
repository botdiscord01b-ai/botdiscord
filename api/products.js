import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            let data = await kv.get('yulgang_store_data');
            
            // ถ้ายังไม่มีข้อมูลในคีย์ใหม่ ให้สร้างค่าเริ่มต้น
            if (!data) {
                data = {
                    products: [
                        { id: 1, name: "หินออฟชั่นพลังโจมตี (ชิ้น)", desc: "หินดรอปจากมอนสเตอร์ระดับสูง สเตตัสสวยพร้อมใช้", amount: 1, price: 35, currency: "บาท", image: "" },
                        { id: 2, name: "คัมภีร์วิชาตัวเบา", desc: "ไอเทมดรอปหายากสำหรับอัปเกรดสกิลเคลื่อนที่", amount: 1, price: 80, currency: "บาท", image: "" },
                        { id: 3, name: "ขยะดรอปสะสม (แพ็ก 100 ชิ้น)", desc: "ไอเทมขยะจากมอนสเตอร์ นำไปขายต่อหรือทำเควสได้คุ้มๆ", amount: 100, price: 20, currency: "บาท", image: "" }
                    ],
                    orders: [],
                    chats: {}
                };
                await kv.set('yulgang_store_data', data);
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

            // รองรับทั้งข้อมูลแบบเก่าและแบบใหม่ (สินค้า, ออร์เดอร์, แชท)
            const storeData = {
                products: bodyData.products || [],
                orders: bodyData.orders || [],
                chats: bodyData.chats || {}
            };

            await kv.set('yulgang_store_data', storeData);
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
