// ... existing code ...

static async search(query) {
  try {
    const response = await fetch(
      `${this.API_BASE}/search?query=${encodeURIComponent(query)}`,
      { headers: { 'Cache-Control': 'no-cache' } }
    );

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Search failed');
    }

    return data.results || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// ... rest of the service code ...