// Cell size in degrees (~55m at equator, suitable for running territory)
export const CELL_SIZE = 0.0005;

// Convert lat/lng to a grid cell key
export function latLngToCell(lat, lng) {
  const row = Math.floor(lat / CELL_SIZE);
  const col = Math.floor(lng / CELL_SIZE);
  return { row, col, key: `${row}_${col}` };
}

// Get polygon coordinates for a cell (for MapView Polygon)
export function cellToPolygon(row, col) {
  return [
    { latitude: row * CELL_SIZE,       longitude: col * CELL_SIZE },
    { latitude: (row + 1) * CELL_SIZE, longitude: col * CELL_SIZE },
    { latitude: (row + 1) * CELL_SIZE, longitude: (col + 1) * CELL_SIZE },
    { latitude: row * CELL_SIZE,       longitude: (col + 1) * CELL_SIZE },
  ];
}

// Get center of a cell
export function cellCenter(row, col) {
  return {
    latitude: (row + 0.5) * CELL_SIZE,
    longitude: (col + 0.5) * CELL_SIZE,
  };
}

// Haversine distance between two points in meters
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Get all cells crossed along a path (with interpolation to avoid skipping cells)
export function getCellsAlongPath(points) {
  const cells = new Set();
  for (let i = 0; i < points.length; i++) {
    const { key } = latLngToCell(points[i].latitude, points[i].longitude);
    cells.add(key);
    if (i > 0) {
      const steps = 8;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const iLat = points[i - 1].latitude + t * (points[i].latitude - points[i - 1].latitude);
        const iLng = points[i - 1].longitude + t * (points[i].longitude - points[i - 1].longitude);
        cells.add(latLngToCell(iLat, iLng).key);
      }
    }
  }
  return cells;
}

// Generate enemy territory cells around a location
export function generateEnemyCells(lat, lng, count = 20) {
  const cells = [];
  const seen = new Set();
  let attempts = 0;
  while (cells.length < count && attempts < 200) {
    attempts++;
    const offsetRow = Math.floor((Math.random() - 0.5) * 40);
    const offsetCol = Math.floor((Math.random() - 0.5) * 40);
    const baseCell = latLngToCell(lat, lng);
    const row = baseCell.row + offsetRow;
    const col = baseCell.col + offsetCol;
    const key = `${row}_${col}`;
    if (!seen.has(key)) {
      seen.add(key);
      // Cluster cells for more natural territory shapes
      cells.push({ key, row, col, health: Math.ceil(Math.random() * 3), owner: 'enemy' });
      // Add some adjacent cells to form clusters
      if (Math.random() > 0.5) {
        const adjKey = `${row + 1}_${col}`;
        if (!seen.has(adjKey)) { seen.add(adjKey); cells.push({ key: adjKey, row: row + 1, col, health: 2, owner: 'enemy' }); }
      }
      if (Math.random() > 0.5) {
        const adjKey = `${row}_${col + 1}`;
        if (!seen.has(adjKey)) { seen.add(adjKey); cells.push({ key: adjKey, row, col: col + 1, health: 2, owner: 'enemy' }); }
      }
    }
  }
  return cells;
}

// Format meters to human-readable distance
export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
}

// Format seconds/km pace
export function formatPace(metersPerSecond) {
  if (!metersPerSecond || metersPerSecond < 0.5) return '--\'--"';
  const secPerKm = 1000 / metersPerSecond;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}'${sec.toString().padStart(2, '0')}"`;
}

// Format duration in seconds
export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Calculate approximate area of captured cells in m²
export function cellsToArea(count) {
  const cellAreaM2 = CELL_SIZE * 111320 * CELL_SIZE * 111320;
  return Math.round(count * cellAreaM2);
}

export function formatArea(m2) {
  if (m2 < 10000) return `${Math.round(m2)}m²`;
  return `${(m2 / 10000).toFixed(1)}ha`;
}
