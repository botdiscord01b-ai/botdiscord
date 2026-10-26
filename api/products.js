import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            let products = await kv.get('yulgang_drop_products');
            if (!products) {
                products = [
                    { id: 1, name: "หินออฟชั่นพลังโจมตี (ชิ้น)", desc: "หินดรอปจากมอนสเตอร์ระดับสูง สเตตัสสวยพร้อมใช้", amount: 1, price: 35, currency: "บาท", image: "" },
                    { id: 2, name: "คัมภีร์วิชาตัวเบา", desc: "ไอเทมดรอปหายากสำหรับอัปเกรดสกิลเคลื่อนที่", amount: 1, price: 80, currency: "บาท", image: "" },
                    { id: 3, name: "ขยะดรอปสะสม (แพ็ก 100 ชิ้น)", desc: "ไอเทมขยะจากมอนสเตอร์ นำไปขายต่อหรือทำเควสได้คุ้มๆ", amount: 100, price: 20, currency: "บาท", image: "" }
                ];
                await kv.set('yulgang_drop_products', products);
            }
            return res.status(200).json(products);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    if (req.method === 'POST') {
        try {
            // ป้องกันกรณี body เป็น string หรือ json object
            let bodyData = req.body;
            if (typeof bodyData === 'string') {
                bodyData = JSON.parse(bodyData);
            }

            const { products } = bodyData;
            
            if (!products) {
                return res.status(400).json({ error: 'No products data provided' });
            }

            await kv.set('yulgang_drop_products', products);
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
