const cron = require('node-cron');
const mysql = require('mysql2/promise');

async function processMaintenanceForDatabase(conn, dbName) {
  try {
    await conn.query(`USE \`${dbName}\``);

    // Get active config
    const [configs] = await conn.query('SELECT * FROM maintenance_config WHERE is_active = 1 LIMIT 1');
    if (configs.length === 0) return; // No active config
    
    const config = configs[0];
    const amount = config.amount;
    
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
    
    // Check if we already generated for this month (by checking if any exist, or trusting INSERT IGNORE)
    // We can use INSERT IGNORE with a unique key on (flat_id, month) which we added during migration!
    
    // Get all flats
    const [flats] = await conn.query('SELECT id FROM flats');
    if (flats.length === 0) return;

    // Due date: usually exact same date next month, or a specific day. Let's make it 5th of current month or similar.
    // The prompt says: "due_date = same day next month" relative to generation or start date.
    // Let's set due date as end of the current month or 1 month from generation.
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    
    const values = flats.map(f => [
      f.id,
      amount,
      currentMonthStr,
      dueDate.toISOString().slice(0, 10), // YYYY-MM-DD
      'Pending'
    ]);

    // Use INSERT IGNORE to prevent duplicates if cron runs multiple times
    if (values.length > 0) {
      const [result] = await conn.query(
        'INSERT IGNORE INTO maintenance (flat_id, amount, month, due_date, status) VALUES ?',
        [values]
      );
      if (result.affectedRows > 0) {
        console.log(`[Maintenance Cron] Generated ${result.affectedRows} bills for DB: ${dbName} for ${currentMonthStr}`);
      }
    }
    
  } catch (error) {
    console.error(`[Maintenance Cron] Error processing DB ${dbName}:`, error);
  }
}

async function runMaintenanceGeneration() {
  let mainConn;
  try {
    mainConn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    });

    const [dbs] = await mainConn.query('SHOW DATABASES LIKE "society_%"');
    
    for (let dbRow of dbs) {
      const dbName = Object.values(dbRow)[0];
      await processMaintenanceForDatabase(mainConn, dbName);
    }

  } catch (err) {
    console.error('[Maintenance Cron] Global error:', err);
  } finally {
    if (mainConn) await mainConn.end();
  }
}

function startMaintenanceCron() {
  console.log('🕒 Initializing Maintenance Auto-Generation Cron...');
  
  // Run on the 1st day of every month at midnight (00:01)
  cron.schedule('1 0 1 * *', async () => {
    console.log('⏰ Running monthly maintenance generation...');
    await runMaintenanceGeneration();
  });
  
  // Also run it once on startup (or when activated manually) to backfill current month if missing
  // runMaintenanceGeneration();
}

module.exports = startMaintenanceCron;
