const axios = require('axios');

module.exports = {
  type: 'bazarr',
  defaultInterval: 30,

  async fetch(app, credential) {
    const baseUrl = app.url.replace(/\/$/, '');
    const headers = {};

    if (credential?.api_key) {
      headers['X-Api-Key'] = credential.api_key;
    }

    const client = axios.create({ baseURL: baseUrl, headers, timeout: 10000 });

    const [statusRes, wantedSeriesRes, wantedMoviesRes, historyRes, providersRes] = await Promise.all([
      client.get('/api/system/status'),
      client.get('/api/episodes/wanted', { params: { length: 5 } }),
      client.get('/api/movies/wanted', { params: { length: 5 } }),
      client.get('/api/episodes/history', { params: { length: 5 } }),
      client.get('/api/providers').catch(() => ({ data: [] })),
    ]);

    const status = statusRes.data;
    const wantedSeries = wantedSeriesRes.data;
    const wantedMovies = wantedMoviesRes.data;
    const history = historyRes.data;
    const providersData = providersRes.data;

    const wantedSeriesCount = wantedSeries.total || (Array.isArray(wantedSeries.data) ? wantedSeries.data.length : 0);
    const wantedMoviesCount = wantedMovies.total || (Array.isArray(wantedMovies.data) ? wantedMovies.data.length : 0);

    const historyItems = (history.data || history || []).slice(0, 5).map(h => ({
      title: h.parsed_title || h.seriesTitle || h.title || 'Unknown',
    }));

    // Providers: try dedicated endpoint, then fall back to status data
    const providersList = Array.isArray(providersData) ? providersData : (Array.isArray(providersData?.data) ? providersData.data : []);
    const providerCount = providersList.length;
    const providerNames = providersList.map(p => p.name || p).filter(Boolean);

    return {
      status: 'online',
      version: status.data?.bazarr_version || status.version || null,
      wanted_series: wantedSeriesCount,
      wanted_movies: wantedMoviesCount,
      history: historyItems,
      providers: providerCount,
      provider_list: providerNames,
    };
  },

  historyKeys: ['wanted_series', 'wanted_movies'],
};
