const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
let db;
let collection;

async function connectToMongoDB() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db(process.env.DB_NAME || 'your_database');
    collection = db.collection('im_sku_flat_table');
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Optimized search function
async function searchWithPagination(searchQuery, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  const pipeline = [
    {
      '$search': {
        index: 'im_sku_flat_table',
        compound: {
          should: [
            // Primary fields with highest boost
            {
              text: {
                query: searchQuery,
                path: 'name',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 10 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'sku_code',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 10 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'sku',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 10 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'ref_item_code',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 10 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'ref_sku_code',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 10 } }
              }
            },
            // Category fields with medium boost
            {
              text: {
                query: searchQuery,
                path: 'category_name1',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 8 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'category_name2',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 8 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'category_name3',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 8 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'category_name4',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 8 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'category_name5',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 8 } }
              }
            },
            // Barcode fields
            {
              text: {
                query: searchQuery,
                path: 'barcodes.type',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 7 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'barcodes.barcode',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 7 } }
              }
            },
            // Attribute fields
            {
              text: {
                query: searchQuery,
                path: 'a1',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 5 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'a2',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 5 } }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'a3',
                fuzzy: { maxEdits: 2 },
                score: { boost: { value: 5 } }
              }
            }
          ],
          minimumShouldMatch: 1
        }
      }
    },
    {
      '$match': { deletedAt: null }
    },
    {
      '$addFields': { score: { '$meta': 'searchScore' } }
    },
    {
      '$match': { score: { '$gt': 4 } }
    },
    {
      '$facet': {
        'results': [
          { '$sort': { score: -1 } },
          { '$skip': skip },
          { '$limit': limit },
          {
            '$project': {
              _id: 1,
              name: 1,
              sku_code: 1,
              vendor_item_id: 1,
              ref_item_code: 1,
              ref_sku_code: 1,
              category_name1: 1,
              category_name2: 1,
              category_name3: 1,
              category_name4: 1,
              category_name5: 1,
              barcodes: 1,
              score: 1,
              createdAt: 1,
              updatedAt: 1
            }
          }
        ],
        'metadata': [
          { '$count': 'totalCount' }
        ]
      }
    },
    {
      '$project': {
        results: 1,
        totalCount: { '$arrayElemAt': ['$metadata.totalCount', 0] },
        currentPage: { '$literal': page },
        pageSize: { '$literal': limit },
        totalPages: {
          '$ceil': {
            '$divide': [
              { '$arrayElemAt': ['$metadata.totalCount', 0] },
              limit
            ]
          }
        }
      }
    }
  ];

  try {
    const result = await collection.aggregate(pipeline).toArray();
    return result[0] || { results: [], totalCount: 0, currentPage: page, pageSize: limit, totalPages: 0 };
  } catch (error) {
    console.error('Error executing search pipeline:', error);
    throw error;
  }
}

// Fast count-only function
async function getSearchCountOnly(searchQuery) {
  const pipeline = [
    {
      '$searchMeta': {
        index: 'im_sku_flat_table',
        compound: {
          should: [
            {
              text: {
                query: searchQuery,
                path: 'name',
                fuzzy: { maxEdits: 2 }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'sku_code',
                fuzzy: { maxEdits: 2 }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'vendor_item_id',
                fuzzy: { maxEdits: 2 }
              }
            }
          ],
          minimumShouldMatch: 1,
          filter: [
            { equals: { path: 'deletedAt', value: null } }
          ]
        }
      }
    }
  ];

  try {
    const result = await collection.aggregate(pipeline).toArray();
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error executing count pipeline:', error);
    throw error;
  }
}

// API Routes
app.get('/api/search', async (req, res) => {
  try {
    const { q: query, page = 1, limit = 10, countOnly = false } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const cacheKey = `search_${query}_${pageNum}_${limitNum}_${countOnly}`;
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return res.json({
        ...cachedResult,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    // Perform search
    const startTime = Date.now();
    let result;

    if (countOnly === 'true') {
      const count = await getSearchCountOnly(query);
      result = { totalCount: count };
    } else {
      result = await searchWithPagination(query, pageNum, limitNum);
    }

    const executionTime = Date.now() - startTime;

    // Add metadata
    const response = {
      ...result,
      query,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString(),
      cached: false
    };

    // Cache the result
    cache.set(cacheKey, response);

    res.json(response);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cache: {
      keys: cache.keys().length,
      stats: cache.getStats()
    }
  });
});

// Clear cache endpoint
app.delete('/api/cache', (req, res) => {
  cache.flushAll();
  res.json({ message: 'Cache cleared successfully' });
});

// Serve HTML frontend
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MongoDB Atlas Search Demo</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            .search-container { margin-bottom: 20px; }
            .search-input { width: 300px; padding: 10px; font-size: 16px; }
            .search-btn { padding: 10px 20px; font-size: 16px; margin-left: 10px; }
            .results-container { margin-top: 20px; }
            .result-item { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .score { background: #e7f3ff; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
            .pagination { margin: 20px 0; }
            .pagination button { margin: 0 5px; padding: 8px 12px; }
            .pagination button.active { background: #007bff; color: white; }
            .pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
            .metadata { background: #f8f9fa; padding: 10px; border-radius: 5px; margin: 10px 0; }
            .loading { text-align: center; padding: 20px; }
            .error { color: red; padding: 10px; background: #ffe6e6; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>MongoDB Atlas Search Demo</h1>
        
        <div class="search-container">
            <input type="text" id="searchInput" class="search-input" placeholder="Search products..." />
            <button onclick="performSearch()" class="search-btn">Search</button>
            <button onclick="getCountOnly()" class="search-btn">Count Only</button>
            <button onclick="clearCache()" class="search-btn">Clear Cache</button>
        </div>

        <div id="loading" class="loading" style="display: none;">Searching...</div>
        <div id="error" class="error" style="display: none;"></div>
        <div id="metadata" class="metadata" style="display: none;"></div>
        <div id="results" class="results-container"></div>
        <div id="pagination" class="pagination"></div>

        <script>
            let currentQuery = '';
            let currentPage = 1;
            const pageSize = 10;

            document.getElementById('searchInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performSearch();
                }
            });

            async function performSearch(page = 1) {
                const query = document.getElementById('searchInput').value.trim();
                if (!query) return;

                currentQuery = query;
                currentPage = page;

                showLoading(true);
                hideError();

                try {
                    const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}&page=\${page}&limit=\${pageSize}\`);
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Search failed');
                    }

                    displayResults(data);
                    displayMetadata(data);
                    displayPagination(data);
                } catch (error) {
                    showError(error.message);
                } finally {
                    showLoading(false);
                }
            }

            async function getCountOnly() {
                const query = document.getElementById('searchInput').value.trim();
                if (!query) return;

                showLoading(true);
                hideError();

                try {
                    const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}&countOnly=true\`);
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Count failed');
                    }

                    document.getElementById('results').innerHTML = \`
                        <div class="result-item">
                            <h3>Total Count: \${data.totalCount}</h3>
                            <p>Execution Time: \${data.executionTime}</p>
                            <p>Cached: \${data.cached ? 'Yes' : 'No'}</p>
                        </div>
                    \`;
                    displayMetadata(data);
                    document.getElementById('pagination').innerHTML = '';
                } catch (error) {
                    showError(error.message);
                } finally {
                    showLoading(false);
                }
            }

            function displayResults(data) {
                const resultsContainer = document.getElementById('results');
                
                if (!data.results || data.results.length === 0) {
                    resultsContainer.innerHTML = '<p>No results found.</p>';
                    return;
                }

                const html = data.results.map(item => \`
                    <div class="result-item">
                        <h3>\${item.name || 'N/A'}</h3>
                        <p><strong>SKU:</strong> \${item.sku_code || 'N/A'}</p>
                        <p><strong>Vendor ID:</strong> \${item.vendor_item_id || 'N/A'}</p>
                        <p><strong>Category:</strong> \${item.category_name1 || 'N/A'}</p>
                        <p><strong>Score:</strong> <span class="score">\${item.score?.toFixed(2) || 'N/A'}</span></p>
                    </div>
                \`).join('');

                resultsContainer.innerHTML = html;
            }

            function displayMetadata(data) {
                const metadataContainer = document.getElementById('metadata');
                const html = \`
                    <strong>Query:</strong> \${data.query || 'N/A'} | 
                    <strong>Total Results:</strong> \${data.totalCount || 0} | 
                    <strong>Page:</strong> \${data.currentPage || 1} of \${data.totalPages || 1} | 
                    <strong>Execution Time:</strong> \${data.executionTime || 'N/A'} | 
                    <strong>Cached:</strong> \${data.cached ? 'Yes' : 'No'}
                \`;
                metadataContainer.innerHTML = html;
                metadataContainer.style.display = 'block';
            }

            function displayPagination(data) {
                const paginationContainer = document.getElementById('pagination');
                
                if (!data.totalPages || data.totalPages <= 1) {
                    paginationContainer.innerHTML = '';
                    return;
                }

                let html = '';
                
                // Previous button
                html += \`<button onclick="performSearch(\${data.currentPage - 1})" \${data.currentPage <= 1 ? 'disabled' : ''}>Previous</button>\`;
                
                // Page numbers
                const startPage = Math.max(1, data.currentPage - 2);
                const endPage = Math.min(data.totalPages, data.currentPage + 2);
                
                for (let i = startPage; i <= endPage; i++) {
                    html += \`<button onclick="performSearch(\${i})" \${i === data.currentPage ? 'class="active"' : ''}>\${i}</button>\`;
                }
                
                // Next button
                html += \`<button onclick="performSearch(\${data.currentPage + 1})" \${data.currentPage >= data.totalPages ? 'disabled' : ''}>Next</button>\`;
                
                paginationContainer.innerHTML = html;
            }

            function showLoading(show) {
                document.getElementById('loading').style.display = show ? 'block' : 'none';
            }

            function showError(message) {
                const errorContainer = document.getElementById('error');
                errorContainer.textContent = message;
                errorContainer.style.display = 'block';
            }

            function hideError() {
                document.getElementById('error').style.display = 'none';
            }

            async function clearCache() {
                try {
                    const response = await fetch('/api/cache', { method: 'DELETE' });
                    const data = await response.json();
                    alert(data.message);
                } catch (error) {
                    alert('Failed to clear cache: ' + error.message);
                }
            }
        </script>
    </body>
    </html>
  `);
});

// Start server
async function startServer() {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
}); 