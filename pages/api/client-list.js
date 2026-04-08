import { getClientList } from '../../lib/agent-studio';

export default async function handler(req, res) {
  try {
    const salesCode = req.query.sales_code || 'RAMPVERIMG';
    const priorityFilter = (req.query.priority_filter || 'ALL').toUpperCase();
    const sortOption = req.query.sort || 'default';
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.page_size || '20', 10);

    const data = await getClientList({ salesCode, priorityFilter, sortOption, page, pageSize });
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load client list' });
  }
}
