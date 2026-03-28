/**
 * Controller for Dashboard Analytics
 */
class DashboardController {
  /**
   * Get summary stats for the society dashboard
   */
  async getStats(req, res) {
    try {
      const tenantDB = req.tenantDB;
      if (!tenantDB) {
        return res.status(400).json({ success: false, message: 'Tenant context required.' });
      }

      // Execute queries in parallel for better performance
      const [
        [flatsCount],
        [residentsCount],
        [visitorsToday],
        [maintenanceDue],
        [monthlyCollection]
      ] = await Promise.all([
        tenantDB.query('SELECT COUNT(*) as count FROM flats'),
        tenantDB.query('SELECT COUNT(*) as count FROM residents'),
        tenantDB.query('SELECT COUNT(*) as count FROM visitors WHERE DATE(entry_time) = CURDATE()'),
        tenantDB.query("SELECT COUNT(*) as count FROM maintenance WHERE status = 'pending'"),
        tenantDB.query("SELECT COALESCE(SUM(amount), 0) as total FROM maintenance WHERE status = 'paid' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())")
      ]);

      res.json({
        success: true,
        stats: {
          total_flats: flatsCount[0].count,
          total_residents: residentsCount[0].count,
          visitors_today: visitorsToday[0].count,
          maintenance_due: maintenanceDue[0].count,
          monthly_collection: parseFloat(monthlyCollection[0].total) || 0
        }
      });
    } catch (error) {
      console.error('Stats API Error:', error);
      res.status(500).json({ success: false, message: 'Error fetching statistics.' });
    }
  }

  /**
   * Get recent activity across visitors, maintenance, and complaints
   */
  async getActivity(req, res) {
    try {
      const tenantDB = req.tenantDB;
      if (!tenantDB) {
        return res.status(400).json({ success: false, message: 'Tenant context required.' });
      }

      // Fetch latest from different sources to simulate an activity feed
      const [visitorLogs] = await tenantDB.query("SELECT entry_time as time, CONCAT('Visitor Entry: ', visitor_name) as event, 'System' as user FROM visitors ORDER BY entry_time DESC LIMIT 5");

      const [complaintLogs] = await tenantDB.query("SELECT created_at as time, CONCAT('New Complaint: ', title) as event, 'Resident' as user FROM complaints ORDER BY created_at DESC LIMIT 5");

      const [maintenanceLogs] = await tenantDB.query("SELECT created_at as time, 'Maintenance Bill Generated' as event, 'Admin' as user FROM maintenance ORDER BY created_at DESC LIMIT 5");

      // Combine, sort by time, and take top 10
      const activities = [...visitorLogs, ...complaintLogs, ...maintenanceLogs]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10);

      res.json({
        success: true,
        activity: activities
      });
    } catch (error) {
      console.error('Activity API Error:', error);
      res.status(500).json({ success: false, message: 'Error fetching activity.' });
    }
  }

  /**
   * Get chart data for visitors and maintenance
   */
  async getChartData(req, res) {
    try {
      const tenantDB = req.tenantDB;
      if (!tenantDB) {
        return res.status(400).json({ success: false, message: 'Tenant context required.' });
      }
      
      // 1. Visitor Trend (Last 7 Days)
      const [visitorTrend] = await tenantDB.query("SELECT DATE(entry_time) as date, COUNT(*) as count FROM visitors WHERE entry_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(entry_time) ORDER BY date ASC");

      // 2. Maintenance Collection (Monthly)
      const [maintenanceTrend] = await tenantDB.query("SELECT DATE_FORMAT(created_at, '%b %Y') as month, SUM(amount) as total FROM maintenance WHERE status = 'paid' GROUP BY month ORDER BY MIN(created_at) ASC LIMIT 6");

      res.json({
        success: true,
        charts: {
          visitorTrend,
          maintenanceTrend
        }
      });
    } catch (error) {
      console.error('Chart API Error:', error);
      res.status(500).json({ success: false, message: 'Error fetching chart data.' });
    }
  }
}

module.exports = new DashboardController();
