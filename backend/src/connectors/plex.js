const axios = require('axios');

// Cache library counts — they rarely change
const libCountCache = new Map();
const LIB_COUNT_TTL = 300000; // 5 minutes

module.exports = {
  type: 'plex',
  defaultInterval: 5,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const token = credential?.api_key || credential?.api_token;

    if (!token) {
      throw new Error('Plex requires an API token (X-Plex-Token)');
    }

    const client = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-Plex-Token': token,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    // Sessions are time-critical — fetch separately with short timeout
    const sessionsClient = axios.create({
      baseURL: baseUrl,
      headers: {
        'X-Plex-Token': token,
        Accept: 'application/json',
      },
      timeout: 5000,
    });

    // Fetch sessions first (most important for live updates)
    const sessionsRes = await sessionsClient.get('/status/sessions').catch(() => ({ data: { MediaContainer: {} } }));
    const sessionsData = sessionsRes.data?.MediaContainer?.Metadata || [];

    const streams = sessionsData.map(s => {
      const media = s.Media?.[0] || {};
      const isTranscoding = !!(s.TranscodeSession);
      const resolution = media.videoResolution ? `${media.videoResolution}p` : '';

      return {
        user: s.User?.title || 'Unknown',
        title: s.grandparentTitle
          ? `${s.grandparentTitle} - ${s.title}`
          : s.title || 'Unknown',
        quality: resolution,
        transcoding: isTranscoding,
        play_method: isTranscoding ? 'transcode' : 'direct play',
      };
    });

    // Library counts — use cache if fresh
    const cacheKey = app.id;
    const cached = libCountCache.get(cacheKey);
    let libCounts, libraryCount, version;

    if (cached && Date.now() - cached.ts < LIB_COUNT_TTL) {
      libCounts = cached.libCounts;
      libraryCount = cached.libraryCount;
      version = cached.version;
    } else {
      // Fetch identity and libraries (less time-critical)
      const [identityRes, librariesRes] = await Promise.allSettled([
        client.get('/identity'),
        client.get('/library/sections'),
      ]);

      const identity = identityRes.status === 'fulfilled' ? identityRes.value.data?.MediaContainer : {};
      version = identity?.version;

      const libraries = librariesRes.status === 'fulfilled'
        ? (librariesRes.value.data?.MediaContainer?.Directory || [])
        : [];

      libraryCount = libraries.length;
      libCounts = { movies: 0, shows: 0, episodes: 0, albums: 0, tracks: 0 };

      const countPromises = libraries.map(async (lib) => {
        try {
          const res = await client.get(`/library/sections/${lib.key}/all`, {
            params: { 'X-Plex-Container-Start': 0, 'X-Plex-Container-Size': 0 },
          });
          const total = res.data?.MediaContainer?.totalSize || res.data?.MediaContainer?.size || 0;
          if (lib.type === 'movie') libCounts.movies += total;
          else if (lib.type === 'show') libCounts.shows += total;
          else if (lib.type === 'artist') libCounts.albums += total;
        } catch { /* skip */ }
      });
      await Promise.all(countPromises);

      libCountCache.set(cacheKey, { libCounts, libraryCount, version, ts: Date.now() });
    }

    // Fetch recently added
    let recently_added = [];
    try {
      const recentRes = await client.get('/library/recentlyAdded', {
        params: { 'X-Plex-Container-Start': 0, 'X-Plex-Container-Size': 8 },
      });
      const recentItems = recentRes.data?.MediaContainer?.Metadata || [];
      recently_added = recentItems.map(item => {
        let title = item.title || 'Unknown';
        let subtitle = null;

        if (item.type === 'episode') {
          title = item.grandparentTitle || item.title;
          const se = [];
          if (item.parentIndex != null) se.push(`S${String(item.parentIndex).padStart(2, '0')}`);
          if (item.index != null) se.push(`E${String(item.index).padStart(2, '0')}`);
          subtitle = se.length > 0 ? `${se.join('')} · ${item.title}` : item.title;
        } else if (item.type === 'season') {
          title = item.parentTitle || item.title;
          subtitle = item.title;
        } else if (item.type === 'track') {
          title = item.grandparentTitle ? `${item.grandparentTitle} · ${item.title}` : item.title;
        }

        return { title, subtitle, type: item.type || 'unknown', year: item.year || null };
      });
    } catch { /* skip */ }

    return {
      status: 'online',
      version: version ? version.split('-')[0] : null,
      movies: libCounts.movies,
      shows: libCounts.shows,
      albums: libCounts.albums,
      tracks: libCounts.tracks,
      active_streams: streams.length,
      streams,
      libraries: libraryCount,
      recently_added,
    };
  },

  historyKeys: ['active_streams'],
};
