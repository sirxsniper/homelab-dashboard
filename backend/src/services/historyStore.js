// In-memory rolling history for sparkline graphs
// Stores the last N data points per key (e.g., 'proxmox_cpu', 'unraid_ram')

class HistoryStore {
  constructor(maxPoints = 60) {
    this.maxPoints = maxPoints;
    this.data = {};
  }

  push(key, value) {
    if (value == null || isNaN(value)) return;
    if (!this.data[key]) this.data[key] = [];
    this.data[key].push(Math.round(value * 100) / 100);
    if (this.data[key].length > this.maxPoints) {
      this.data[key].shift();
    }
  }

  get(key) {
    return this.data[key] || [];
  }

  getAll() {
    return { ...this.data };
  }
}

// Singleton
const store = new HistoryStore(60);

module.exports = store;
