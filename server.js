const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const NodeCache = require('node-cache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cache with 5 minute TTL
const searchCache = new NodeCache({ 
  stdTTL: 300,  // 5 minutes
  checkperiod: 60,  // Check for expired keys every minute
  maxKeys: 1000  // Maximum number of keys
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connections
let masterDb;
let masterClient;
let enterpriseDb;
let enterpriseClient;
let enterpriseCollection;

async function connectToMasterDB() {
  try {
    masterClient = new MongoClient(process.env.MONGODB_URI);
    await masterClient.connect();
    masterDb = masterClient.db('crm-production');
  } catch (error) {
    console.error('Master MongoDB connection error:', error);
    process.exit(1);
  }
}

async function connectToEnterpriseDB(enterpriseId) {
  try {
    const enterprise = await masterDb.collection('enterprises').findOne({ 
      _id: new ObjectId(enterpriseId),
      deletedOn: null 
    });

    if (!enterprise?.meta?.dbConfig?.dbName) {
      throw new Error('Enterprise not found or configuration missing');
    }

    enterpriseClient = new MongoClient(process.env.MONGODB_URI);
    await enterpriseClient.connect();
    enterpriseDb = enterpriseClient.db(enterprise.meta.dbConfig.dbName);
    enterpriseCollection = enterpriseDb.collection('im_sku_flat_table');
    return enterprise;
  } catch (error) {
    if (enterpriseClient) {
      await enterpriseClient.close();
    }
    throw error;
  }
}

async function getAllEnterprises() {
  return await masterDb.collection('enterprises')
    .find({ 
      deletedOn: null,
      liveStatus: 1
    })
    .project({
      _id: 1,
      tradeName: 1,
      legalName: 1,
      baCode: 1,
      email: 1,
      'meta.dbConfig.dbName': 1
    })
    .toArray();
}

async function searchWithPagination(searchQuery, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  if (!enterpriseCollection) {
    throw new Error('No enterprise collection available');
  }

  const startTime = Date.now();
  const searchConditions = {
    $text: { 
      $search: searchQuery,
      $caseSensitive: false,
      $diacriticSensitive: false
    },
    deletedAt: null
  };

  const totalCount = await enterpriseCollection.countDocuments(searchConditions);
  const results = await enterpriseCollection
    .find(searchConditions)
    .sort({ score: { $meta: "textScore" } })
    .skip(skip)
    .limit(limit)
    .project({
      _id: 1,
      name: 1,
      sku_code: 1,
      score: { $meta: "textScore" }
    })
    .toArray();

  const executionTime = Date.now() - startTime;
  console.log(`Search executed in ${executionTime}ms`);

  return {
    results,
    totalCount,
    currentPage: page,
    pageSize: limit,
    totalPages: Math.ceil(totalCount / limit),
    executionTime
  };
}

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
                fuzzy: { maxEdits: 2, prefixLength: 1 }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'sku_code',
                fuzzy: { maxEdits: 2, prefixLength: 1 }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'vendor_item_id',
                fuzzy: { maxEdits: 2, prefixLength: 1 }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'ref_item_code',
                fuzzy: { maxEdits: 2, prefixLength: 1 }
              }
            },
            {
              text: {
                query: searchQuery,
                path: 'ref_sku_code',
                fuzzy: { maxEdits: 2, prefixLength: 1 }
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
    const result = await enterpriseCollection.aggregate(pipeline).toArray();
    return result[0]?.count || 0;
  } catch (error) {
    throw error;
  }
}

// API Routes
app.get('/api/enterprises', async (req, res) => {
  try {
    const enterprises = await getAllEnterprises();
    res.json(enterprises);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch enterprises' });
  }
});

app.post('/api/enterprise/connect', async (req, res) => {
  try {
    const { enterpriseId } = req.body;
    if (!enterpriseId) {
      return res.status(400).json({ error: 'Enterprise ID is required' });
    }

    const enterprise = await connectToEnterpriseDB(enterpriseId);
    res.json({ 
      message: 'Connected to enterprise database',
      enterprise: {
        id: enterprise._id,
        name: enterprise.tradeName,
        dbName: enterprise.meta.dbConfig.dbName
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q: query, page = 1, limit = 10 } = req.query;
    
    if (!query?.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (!enterpriseCollection) {
      return res.status(400).json({ error: 'No enterprise selected' });
    }

    const result = await searchWithPagination(query, parseInt(page), parseInt(limit));
    res.json({
      ...result,
      query,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Add cache clearing endpoint
app.post('/api/cache/clear', (req, res) => {
  searchCache.flushAll();
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
            .container { margin-bottom: 20px; }
            .search-container { margin-bottom: 20px; }
            .search-input { width: 300px; padding: 10px; font-size: 16px; }
            .search-btn { padding: 10px 20px; font-size: 16px; margin-left: 10px; }
            .enterprise-select { width: 300px; padding: 10px; font-size: 16px; margin-bottom: 10px; }
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
            .enterprise-info { background: #e7f3ff; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <h1>MongoDB Atlas Search Demo</h1>
        
        <div class="container">
            <select id="enterpriseSelect" class="enterprise-select">
                <option value="">Select Enterprise</option>
            </select>
            <div id="enterpriseInfo" class="enterprise-info" style="display: none;"></div>
        </div>

        <div class="search-container">
            <input type="text" id="searchInput" class="search-input" placeholder="Search products..." disabled />
            <button onclick="performSearch()" class="search-btn" disabled>Search</button>
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
            let currentEnterprise = null;

            async function loadEnterprises() {
                try {
                    const response = await fetch('/api/enterprises');
                    const enterprises = await response.json();
                    
                    const select = document.getElementById('enterpriseSelect');
                    enterprises.forEach(enterprise => {
                        const option = document.createElement('option');
                        option.value = enterprise._id;
                        option.textContent = \`\${enterprise.tradeName} (\${enterprise.baCode})\`;
                        select.appendChild(option);
                    });
                } catch (error) {
                    showError('Failed to load enterprises: ' + error.message);
                }
            }

            document.getElementById('enterpriseSelect').addEventListener('change', async function(e) {
                const enterpriseId = e.target.value;
                if (!enterpriseId) {
                    document.getElementById('searchInput').disabled = true;
                    document.querySelector('.search-btn').disabled = true;
                    document.getElementById('enterpriseInfo').style.display = 'none';
                    return;
                }

                try {
                    const response = await fetch('/api/enterprise/connect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ enterpriseId })
                    });

                    if (!response.ok) throw new Error('Failed to connect to enterprise');

                    const data = await response.json();
                    currentEnterprise = data.enterprise;

                    document.getElementById('searchInput').disabled = false;
                    document.querySelector('.search-btn').disabled = false;
                    
                    const infoDiv = document.getElementById('enterpriseInfo');
                    infoDiv.innerHTML = \`
                        <strong>Connected to:</strong> \${currentEnterprise.name}<br>
                        <strong>Database:</strong> \${currentEnterprise.dbName}
                    \`;
                    infoDiv.style.display = 'block';

                } catch (error) {
                    showError('Failed to connect to enterprise: ' + error.message);
                }
            });

            document.getElementById('searchInput').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') performSearch();
            });

            async function performSearch(page = 1) {
                if (!currentEnterprise) {
                    showError('Please select an enterprise first');
                    return;
                }

                const query = document.getElementById('searchInput').value.trim();
                if (!query) return;

                currentQuery = query;
                currentPage = page;

                showLoading(true);
                hideError();

                try {
                    const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}&page=\${page}&limit=\${pageSize}\`);
                    const data = await response.json();

                    if (!response.ok) throw new Error(data.error || 'Search failed');

                    displayResults(data);
                    displayMetadata(data);
                    displayPagination(data);
                } catch (error) {
                    showError(error.message);
                } finally {
                    showLoading(false);
                }
            }

            function displayResults(data) {
                const resultsContainer = document.getElementById('results');
                
                if (!data.results?.length) {
                    resultsContainer.innerHTML = '<p>No results found.</p>';
                    return;
                }

                const html = data.results.map(item => \`
                    <div class="result-item">
                        <h3>\${item.name || 'N/A'}</h3>
                        <p><strong>SKU:</strong> \${item.sku_code || 'N/A'}</p>
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
                    <strong>Execution Time:</strong> \${data.executionTime}ms
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
                
                html += \`<button onclick="performSearch(\${data.currentPage - 1})" \${data.currentPage <= 1 ? 'disabled' : ''}>Previous</button>\`;
                
                const startPage = Math.max(1, data.currentPage - 2);
                const endPage = Math.min(data.totalPages, data.currentPage + 2);
                
                for (let i = startPage; i <= endPage; i++) {
                    html += \`<button onclick="performSearch(\${i})" \${i === data.currentPage ? 'class="active"' : ''}>\${i}</button>\`;
                }
                
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

            loadEnterprises();
        </script>
    </body>
    </html>
  `);
});

// Start server
async function startServer() {
  await connectToMasterDB();
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => process.exit(0)); 