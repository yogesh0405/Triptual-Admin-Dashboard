import { firstColumn, pool, quoteIdentifier, tableColumns } from '../modules/db.js';

export async function getDashboard(_req, res) {
  const userTables = await tableColumns(['users', 'user', 'accounts', 'profiles']);
  const tripTables = await tableColumns(['trips', 'trip']);
  const paymentTables = await tableColumns(['payments', 'payment', 'transactions', 'transaction']);
  const userTable = ['users', 'user', 'accounts', 'profiles'].find((name) => userTables.has(name));
  const tripTable = ['trips', 'trip'].find((name) => tripTables.has(name));
  const paymentTable = ['payments', 'payment', 'transactions', 'transaction'].find((name) => paymentTables.has(name));
  const userCount = userTable ? (await pool.query(`SELECT COUNT(*)::int count FROM ${quoteIdentifier(userTable)}`)).rows[0].count : 0;
  const tripCount = tripTable ? (await pool.query(`SELECT COUNT(*)::int count FROM ${quoteIdentifier(tripTable)}`)).rows[0].count : 0;
  const paymentColumns = paymentTable ? paymentTables.get(paymentTable) : new Set();
  const amount = paymentTable ? firstColumn(paymentColumns, ['amount', 'total', 'price']) : undefined;
  const paymentStatus = paymentTable ? firstColumn(paymentColumns, ['status', 'payment_status']) : undefined;
  const revenue = paymentTable && amount ? (await pool.query(`SELECT COALESCE(SUM(${quoteIdentifier(amount)}), 0)::numeric revenue FROM ${quoteIdentifier(paymentTable)}${paymentStatus ? ` WHERE lower(${quoteIdentifier(paymentStatus)}::text) = 'success'` : ''}`)).rows[0].revenue : 0;
  return res.json({ kpis: { activeTrips: tripCount, registeredTravelers: userCount, revenue: Number(revenue), settlements: 0 }, monthlyTrips: [], monthlyRevenue: [], settlements: [], tiers: [], activity: [] });
}
