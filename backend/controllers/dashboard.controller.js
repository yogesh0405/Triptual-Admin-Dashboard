import { firstColumn, pool, quoteIdentifier, tableColumns } from '../modules/db.js';

const PAYMENT_TABLE_CANDIDATES = ['payment_transactions', 'payments', 'payment', 'transactions', 'transaction'];
const SUCCESS_STATUSES = ['success', 'succeeded', 'paid', 'captured', 'completed'];
const REFUND_STATUSES = ['refund', 'refunded', 'partially_refunded'];

const optionalColumn = (columns, names) => firstColumn(columns, names);

function statusClause(column, statuses, parameterIndex) {
  if (!column) return { sql: '', values: [] };
  return {
    sql: `lower(trim(${quoteIdentifier(column)}::text)) = ANY($${parameterIndex}::text[])`,
    values: [statuses],
  };
}

async function getRevenueAnalytics(paymentTable, paymentColumns, userTable, userColumns) {
  if (!paymentTable) {
    return { summary: emptyRevenueSummary(), monthly: [], byMethod: [], transactions: [] };
  }

  const amountColumn = optionalColumn(paymentColumns, ['amount', 'payment_amount', 'total', 'price']);
  if (!amountColumn) {
    return { summary: emptyRevenueSummary(), monthly: [], byMethod: [], transactions: [] };
  }

  const statusColumn = optionalColumn(paymentColumns, ['status', 'payment_status']);
  const createdColumn = optionalColumn(paymentColumns, ['created_at', 'paid_at', 'updated_at', 'timestamp']);
  const methodColumn = optionalColumn(paymentColumns, ['payment_method', 'method', 'gateway_method']);
  const transactionIdColumn = optionalColumn(paymentColumns, ['payment_id', 'transaction_id', 'order_id', 'id']);
  const userIdColumn = optionalColumn(paymentColumns, ['user_id', 'payer_id']);
  const groupIdColumn = optionalColumn(paymentColumns, ['group_id']);
  const gatewayColumn = optionalColumn(paymentColumns, ['payment_gateway', 'gateway']);
  const currencyColumn = optionalColumn(paymentColumns, ['currency']);
  const userPrimaryKey = userColumns && optionalColumn(userColumns, ['id', 'user_id']);
  const userNameColumn = userColumns && optionalColumn(userColumns, ['name', 'full_name', 'username']);
  const userEmailColumn = userColumns && optionalColumn(userColumns, ['email', 'email_address', 'email_id']);
  const userAvatarColumn = userColumns && optionalColumn(userColumns, ['avatar', 'avatar_url', 'profile_picture', 'profile_image', 'photo_url']);

  const success = statusClause(statusColumn, SUCCESS_STATUSES, 1);
  const refund = statusClause(statusColumn, REFUND_STATUSES, 2);
  const dateExpression = createdColumn ? quoteIdentifier(createdColumn) : 'CURRENT_TIMESTAMP';
  const amountExpression = `COALESCE(${quoteIdentifier(amountColumn)}::numeric, 0)`;
  const statusExpression = statusColumn ? `lower(trim(${quoteIdentifier(statusColumn)}::text))` : "'success'";
  const methodExpression = methodColumn ? `COALESCE(NULLIF(${quoteIdentifier(methodColumn)}::text, ''), 'Unknown')` : "'Unknown'";
  const transactionMethodExpression = methodColumn ? `COALESCE(NULLIF(pt.${quoteIdentifier(methodColumn)}::text, ''), 'Unknown')` : "'Unknown'";
  const transactionStatusExpression = statusColumn ? `lower(trim(pt.${quoteIdentifier(statusColumn)}::text))` : "'success'";
  const userLookup = (column, fallback = 'NULL::text') => userTable && userIdColumn && userPrimaryKey && column
    ? `(SELECT NULLIF(u.${quoteIdentifier(column)}::text, '') FROM ${quoteIdentifier(userTable)} u WHERE u.${quoteIdentifier(userPrimaryKey)}::text = pt.${quoteIdentifier(userIdColumn)}::text LIMIT 1)`
    : fallback;

  const summaryResult = await pool.query(`
    SELECT
      COALESCE(SUM(${amountExpression}) FILTER (WHERE ${statusColumn ? success.sql : 'TRUE'}), 0)::numeric AS gross,
      COALESCE(SUM(${amountExpression}) FILTER (WHERE ${statusColumn ? refund.sql : 'FALSE'}), 0)::numeric AS refunds,
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE ${statusColumn ? success.sql : 'TRUE'})::int AS successful_count,
      COUNT(*) FILTER (WHERE ${statusColumn ? refund.sql : 'FALSE'})::int AS refund_count
    FROM ${quoteIdentifier(paymentTable)}
  `, statusColumn ? [SUCCESS_STATUSES, REFUND_STATUSES] : []);
  const summary = summaryResult.rows[0];
  const gross = Number(summary.gross || 0);
  const refunds = Number(summary.refunds || 0);
  const processedCount = Number(summary.total_count || 0) - Number(summary.refund_count || 0);

  const [monthlyResult, methodsResult, transactionResult] = await Promise.all([
    pool.query(`
      SELECT to_char(date_trunc('month', ${dateExpression}), 'Mon YYYY') AS month,
             date_trunc('month', ${dateExpression}) AS month_start,
             COALESCE(SUM(${amountExpression}) FILTER (WHERE ${statusColumn ? success.sql : 'TRUE'}), 0)::numeric AS gross,
             COALESCE(SUM(${amountExpression}) FILTER (WHERE ${statusColumn ? refund.sql : 'FALSE'}), 0)::numeric AS refunds
      FROM ${quoteIdentifier(paymentTable)}
      WHERE ${dateExpression} >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
      GROUP BY month_start
      ORDER BY month_start
    `, statusColumn ? [SUCCESS_STATUSES, REFUND_STATUSES] : []),
    pool.query(`
      SELECT ${methodExpression} AS method,
             COUNT(*)::int AS transaction_count,
             COALESCE(SUM(${amountExpression}) FILTER (WHERE ${statusColumn ? success.sql : 'TRUE'}), 0)::numeric AS gross
      FROM ${quoteIdentifier(paymentTable)}
      GROUP BY method
      ORDER BY gross DESC
    `, statusColumn ? [SUCCESS_STATUSES] : []),
    pool.query(`
            SELECT ${transactionIdColumn ? `pt.${quoteIdentifier(transactionIdColumn)}::text` : 'NULL::text'} AS transaction_id,
              ${userIdColumn ? `pt.${quoteIdentifier(userIdColumn)}::text` : 'NULL::text'} AS user_id,
              ${groupIdColumn ? `pt.${quoteIdentifier(groupIdColumn)}::text` : 'NULL::text'} AS group_id,
              ${userLookup(userNameColumn)} AS user_name,
              ${userLookup(userEmailColumn, "''::text")} AS user_email,
              ${userLookup(userAvatarColumn)} AS user_avatar,
              ${amountExpression.replaceAll(`${quoteIdentifier(amountColumn)}`, `pt.${quoteIdentifier(amountColumn)}`)} AS amount,
              ${currencyColumn ? `pt.${quoteIdentifier(currencyColumn)}::text` : "'INR'::text"} AS currency,
               ${transactionMethodExpression} AS payment_method,
              ${gatewayColumn ? `pt.${quoteIdentifier(gatewayColumn)}::text` : "'Unknown'::text"} AS payment_gateway,
               ${transactionStatusExpression} AS status,
              ${createdColumn ? `pt.${quoteIdentifier(createdColumn)}` : 'CURRENT_TIMESTAMP'} AS created_at
            FROM ${quoteIdentifier(paymentTable)} pt
            ORDER BY ${createdColumn ? `pt.${quoteIdentifier(createdColumn)}` : 'created_at'} DESC
      LIMIT 500
    `),
  ]);

  const monthly = monthlyResult.rows.map((row) => ({
    month: row.month,
    gross: Number(row.gross || 0),
    refunds: Number(row.refunds || 0),
    net: Number(row.gross || 0) - Number(row.refunds || 0),
  }));
  const byMethod = methodsResult.rows.map((row) => ({
    method: row.method,
    transactionCount: Number(row.transaction_count),
    gross: Number(row.gross || 0),
  }));
  const transactions = transactionResult.rows.map((row) => ({
    transactionId: row.transaction_id,
    userId: row.user_id,
    userName: row.user_name || row.user_id || 'Unknown user',
    userEmail: row.user_email || 'No user email available',
    userAvatar: row.user_avatar,
    groupId: row.group_id,
    amount: Number(row.amount || 0),
    currency: row.currency || 'INR',
    paymentMethod: row.payment_method,
    paymentGateway: row.payment_gateway,
    status: row.status,
    createdAt: row.created_at,
  }));

  return {
    summary: {
      grossRevenue: gross,
      refunds,
      netRevenue: gross - refunds,
      totalTransactions: Number(summary.total_count || 0),
      successfulTransactions: Number(summary.successful_count || 0),
      successRate: processedCount > 0 ? Number(summary.successful_count || 0) / processedCount * 100 : 0,
      averageTransactionValue: Number(summary.successful_count || 0) > 0 ? gross / Number(summary.successful_count) : 0,
    },
    monthly,
    byMethod,
    transactions,
  };
}

function emptyRevenueSummary() {
  return { grossRevenue: 0, refunds: 0, netRevenue: 0, totalTransactions: 0, successfulTransactions: 0, successRate: 0, averageTransactionValue: 0 };
}

export async function getDashboard(_req, res) {
  try {
    const userTables = await tableColumns(['users', 'user', 'accounts', 'profiles']);
    const tripTables = await tableColumns(['trips', 'trip']);
    const paymentTables = await tableColumns(PAYMENT_TABLE_CANDIDATES);
    const userTable = ['users', 'user', 'accounts', 'profiles'].find((name) => userTables.has(name));
    const tripTable = ['trips', 'trip'].find((name) => tripTables.has(name));
    const paymentTable = PAYMENT_TABLE_CANDIDATES.find((name) => paymentTables.has(name));
    const userCount = userTable ? (await pool.query(`SELECT COUNT(*)::int count FROM ${quoteIdentifier(userTable)}`)).rows[0].count : 0;
    const tripCount = tripTable ? (await pool.query(`SELECT COUNT(*)::int count FROM ${quoteIdentifier(tripTable)}`)).rows[0].count : 0;
    const paymentColumns = paymentTable ? paymentTables.get(paymentTable) : new Set();
    const revenue = await getRevenueAnalytics(paymentTable, paymentColumns, userTable, userTable ? userTables.get(userTable) : undefined);
    return res.json({
      kpis: { activeTrips: tripCount, registeredTravelers: userCount, revenue: revenue.summary.netRevenue, settlements: 0 },
      monthlyTrips: [],
      monthlyRevenue: revenue.monthly.map(({ month, net }) => ({ label: month, value: net })),
      settlements: [],
      tiers: [],
      activity: [],
      revenue,
    });
  } catch (error) {
    console.error('[Dashboard] failed to load analytics:', error.message);
    return res.status(503).json({ error: 'Database connection unavailable' });
  }
}
