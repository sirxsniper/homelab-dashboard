const axios = require('axios');

const ADULT_CONTENT_KEYWORDS = ['erotic', 'xxx', 'adult', 'explicit', 'sex', 'porn', 'nude', 'nsfw', 'hentai'];
const ADULT_RATINGS = ['XXX', 'NC-17', 'X', 'AO'];

function isAdultInstance(app) {
  const name = (app.name || '').toLowerCase();
  return name.includes('pjellyfin') || name.includes('p-jellyfin') || name.includes('adult');
}

function isAdultContent(item) {
  if (item.OfficialRating && ADULT_RATINGS.includes(item.OfficialRating.toUpperCase())) return true;
  const name = (item.Name || '').toLowerCase();
  return ADULT_CONTENT_KEYWORDS.some(kw => name.includes(kw));
}

function maskTitle(name) {
  if (!name || name.length <= 3) return '***';
  return name.slice(0, 3) + '...';
}

module.exports = {
  type: 'jellyfin',
  defaultInterval: 5,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['X-Emby-Token'] = credential.api_key;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });
    const adultInstance = isAdultInstance(app);

    const [countsRes, sessionsRes, infoRes, recentRes, libRes] = await Promise.all([
      client.get('/Items/Counts'),
      client.get('/Sessions'),
      client.get('/System/Info'),
      client.get('/Items', { params: { SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 8, Recursive: true, Fields: 'OfficialRating', IncludeItemTypes: 'Movie,Episode,Series,Audio' } }),
      client.get('/Library/VirtualFolders'),
    ]);

    const counts = countsRes.data;
    const sessions = sessionsRes.data;
    const info = infoRes.data;
    const recentItems = recentRes.data?.Items || [];
    const libraries = libRes.data || [];

    const activeStreams = sessions
      .filter(s => s.NowPlayingItem)
      .map(s => {
        const stream = {
          user: s.UserName,
          title: s.NowPlayingItem?.Name,
          type: s.NowPlayingItem?.Type,
          year: s.NowPlayingItem?.ProductionYear,
          transcoding: !!s.TranscodingInfo,
          play_method: s.PlayState?.PlayMethod,
        };
        // Mask stream titles for adult instances or adult-rated content
        if (adultInstance || (s.NowPlayingItem && isAdultContent(s.NowPlayingItem))) {
          stream.title = maskTitle(stream.title);
          stream.user = (stream.user || '').slice(0, 1) + '***';
        }
        return stream;
      });

    const recently_added = recentItems.map(item => {
      let title = item.Name;
      let subtitle = null;

      if (item.Type === 'Episode') {
        // Show: "Series Name" with subtitle "S01E05 · Episode Title"
        title = item.SeriesName || item.Name;
        const se = [];
        if (item.ParentIndexNumber != null) se.push(`S${String(item.ParentIndexNumber).padStart(2, '0')}`);
        if (item.IndexNumber != null) se.push(`E${String(item.IndexNumber).padStart(2, '0')}`);
        subtitle = se.length > 0 ? `${se.join('')} · ${item.Name}` : item.Name;
      } else if (item.Type === 'Audio') {
        title = item.AlbumArtist ? `${item.AlbumArtist} · ${item.Name}` : item.Name;
      }

      const entry = {
        title,
        subtitle,
        type: item.Type,
        year: item.ProductionYear || null,
      };
      if (adultInstance || isAdultContent(item)) {
        entry.title = maskTitle(entry.title);
        entry.subtitle = null;
      }
      return entry;
    });

    return {
      status: 'online',
      version: info.Version,
      movies: counts.MovieCount || 0,
      series: counts.SeriesCount || 0,
      episodes: counts.EpisodeCount || 0,
      songs: counts.SongCount || 0,
      libraries: libraries.length,
      active_streams: activeStreams.length,
      streams: activeStreams,
      recently_added,
    };
  },

  historyKeys: ['active_streams'],
};
