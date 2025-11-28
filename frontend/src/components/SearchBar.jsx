import { useState } from 'react';

export default function SearchBar({ onSymbolSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8081/api/search?query=${value}`);
      const data = await response.json();
      
      if (data.ok) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
    setLoading(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search stocks..."
        className="w-full px-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {loading && (
        <div className="absolute right-3 top-2.5">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      )}

      {results.length > 0 && (
        <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((item) => (
            <button
              key={item.symbol}
              onClick={() => {
                onSymbolSelect(item.symbol);
                setQuery('');
                setResults([]);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
            >
              <span className="font-medium">{item.symbol}</span>
              <span className="text-sm text-gray-600">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}