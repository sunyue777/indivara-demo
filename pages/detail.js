import { getClientDetail } from '../../lib/agent-studio';

export default async function handler(req, res) {
  try {
    const customerId = req.query.customer_id;
    const fromTag = req.query.from || null;
    if (!customerId) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    const detail = await getClientDetail({ customerId, fromTag });
    if (!detail) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.status(200).json(detail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load client detail' });
  }
}
