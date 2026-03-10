const axios = require('axios');

module.exports = {
  type: 'tautulli',
  defaultInterval: 10,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const apiKey = credential?.api_key || '';

    const client = axios.create({ baseURL: baseUrl, timeout: 10000 });

    const [activityRes, statsRes, historyRes] = await Promise.all([
      client.get('/api/v2', { params: { apikey: apiKey, cmd: 'get_activity' } }),
      client.get('/api/v2', { params: { apikey: apiKey, cmd: 'get_home_stats', time_range: 30 } }),
      client.get('/api/v2', { params: { apikey: apiKey, cmd: 'get_history', length: 3 } }),
    ]);

    const activity = activityRes.data?.response?.data || {};
    const homeStats = statsRes.data?.response?.data || [];
    const historyData = historyRes.data?.response?.data?.data || [];

    const sessions = (activity.sessions || []).map(s => ({
      user: s.friendly_name || s.user || 'Unknown',
      title: s.full_title || s.title || 'Unknown',
      quality: s.quality_profile || s.video_resolution || 'Unknown',
      progress: parseFloat(s.progress_percent) || 0,
      transcode: s.transcode_decision || 'direct play',
    }));

    // Parse home stats
    let playsToday = 0;
    let usersToday = 0;
    let topMovie = null;
    let topShow = null;
    let topUser = null;
    let libraries = 0;

    for (const stat of homeStats) {
      const rows = stat.rows || [];
      switch (stat.stat_id) {
        case 'top_movies':
          if (rows.length > 0) topMovie = rows[0].title || null;
          break;
        case 'top_tv':
          if (rows.length > 0) topShow = rows[0].title || null;
          break;
        case 'top_users':
          if (rows.length > 0) topUser = rows[0].friendly_name || rows[0].user || null;
          usersToday = rows.length;
          break;
        case 'most_concurrent':
        case 'top_platforms':
          break;
        default:
          break;
      }
    }

    // stream_count gives total active
    const activeStreams = parseInt(activity.stream_count) || sessions.length;

    const recent_plays = historyData.slice(0, 3).map(h => ({
      user: h.friendly_name || h.user || 'Unknown',
      title: h.full_title || h.title || 'Unknown',
      date: h.date ? new Date(h.date * 1000).toLocaleDateString('en-GB') : null,
    }));

    return {
      status: 'online',
      plays_today: playsToday,
      active_streams: activeStreams,
      streams: sessions,
      recent_plays,
      users_today: usersToday,
      top_movie: topMovie,
      top_show: topShow,
      top_user: topUser,
      libraries,
    };
  },

  historyKeys: ['active_streams', 'plays_today'],
};
