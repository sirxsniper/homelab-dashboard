const axios = require('axios');

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STATUS_TEXT = { 1: 'Pending', 2: 'Approved', 3: 'Declined' };
const MEDIA_STATUS = { 1: 'Unknown', 2: 'Pending', 3: 'Processing', 4: 'Partial', 5: 'Available', 6: 'Deleted' };

module.exports = {
  type: 'seerr',
  defaultInterval: 30,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['X-Api-Key'] = credential.api_key;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    // Fetch core data in parallel
    const [statusRes, aboutRes, countRes, recentRes, pendingRes, usersRes] = await Promise.all([
      client.get('/api/v1/status'),
      client.get('/api/v1/settings/about').catch(() => ({ data: {} })),
      client.get('/api/v1/request/count').catch(() => ({ data: {} })),
      client.get('/api/v1/request', { params: { take: 10, skip: 0, sort: 'added' } }),
      client.get('/api/v1/request', { params: { take: 20, skip: 0, filter: 'pending', sort: 'added' } }),
      client.get('/api/v1/user', { params: { take: 10, skip: 0, sort: 'requests' } }).catch(() => ({ data: { results: [] } })),
    ]);

    const st = statusRes.data;
    const about = aboutRes.data;
    const counts = countRes.data;

    const pendingData = pendingRes.data;
    const recentData = recentRes.data;
    const usersData = usersRes.data;

    const pendingCount = counts.pending ?? pendingData.pageInfo?.results ?? 0;
    const approvedCount = counts.approved ?? 0;
    const availableCount = counts.available ?? 0;
    const processingCount = counts.processing ?? 0;
    const declinedCount = counts.declined ?? 0;
    const totalRequests = about.totalRequests ?? (pendingCount + approvedCount + availableCount + processingCount + declinedCount);
    const totalMedia = about.totalMediaItems ?? 0;

    // Resolve titles for recent requests via tmdbId lookups
    const recentRaw = (recentData.results || []).slice(0, 10);
    const titleMap = {};
    const lookups = [];

    for (const r of recentRaw) {
      const tmdbId = r.media?.tmdbId;
      const mediaType = r.type || (r.media?.mediaType);
      if (tmdbId && mediaType && !titleMap[`${mediaType}-${tmdbId}`]) {
        titleMap[`${mediaType}-${tmdbId}`] = null; // placeholder
        const endpoint = mediaType === 'movie' ? `/api/v1/movie/${tmdbId}` : `/api/v1/tv/${tmdbId}`;
        lookups.push(
          client.get(endpoint).then(res => {
            const title = res.data?.title || res.data?.name || res.data?.originalTitle || res.data?.originalName || 'Unknown';
            const poster = res.data?.posterPath || null;
            titleMap[`${mediaType}-${tmdbId}`] = { title, poster };
          }).catch(() => {
            titleMap[`${mediaType}-${tmdbId}`] = { title: `ID ${tmdbId}`, poster: null };
          })
        );
      }
    }
    await Promise.all(lookups);

    function mapRequest(r) {
      const tmdbId = r.media?.tmdbId;
      const mediaType = r.type || r.media?.mediaType || 'unknown';
      const resolved = titleMap[`${mediaType}-${tmdbId}`];
      return {
        id: r.id,
        title: resolved?.title || `ID ${tmdbId}`,
        poster: resolved?.poster || null,
        type: mediaType === 'movie' ? 'Movie' : 'TV',
        is4k: r.is4k || false,
        request_status: STATUS_TEXT[r.status] || 'Unknown',
        media_status: MEDIA_STATUS[r.media?.status] || 'Unknown',
        user: r.requestedBy?.displayName || r.requestedBy?.plexUsername || r.requestedBy?.email || 'Unknown',
        user_avatar: r.requestedBy?.avatar || null,
        requested_at: r.createdAt,
        time_ago: timeAgo(r.createdAt),
      };
    }

    const recent = recentRaw.map(mapRequest);
    const pending = (pendingData.results || []).slice(0, 10).map(mapRequest);

    // Top requesters
    const topUsers = (usersData.results || [])
      .filter(u => u.requestCount > 0)
      .slice(0, 5)
      .map(u => ({
        name: u.displayName || u.plexUsername || u.email || 'Unknown',
        avatar: u.avatar || null,
        requests: u.requestCount || 0,
      }));

    return {
      status: 'online',
      version: st.version || null,
      update_available: st.updateAvailable || false,
      commits_behind: st.commitsBehind || 0,
      total_requests: totalRequests,
      total_media: totalMedia,
      pending_count: pendingCount,
      approved_count: approvedCount,
      processing_count: processingCount,
      available_count: availableCount,
      declined_count: declinedCount,
      recent,
      pending,
      top_users: topUsers,
    };
  },

  historyKeys: ['pending_count', 'total_requests'],
};
