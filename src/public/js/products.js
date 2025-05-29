document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const enterpriseSelect = document.getElementById('enterpriseSelect');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsTable = document.getElementById('resultsTable');
    const metadata = document.getElementById('metadata');
    const pageInfo = document.getElementById('pageInfo');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const responseTimeEl = document.getElementById('responseTime');
    const totalResultsEl = document.getElementById('totalResults');
    const currentPageEl = document.getElementById('currentPage');

    // State
    let selectedEnterpriseId = '';
    let currentPage = 1;
    let pageLimit = 20;
    let totalCount = 0;
    let isLoading = false;
    let isCountLoading = false;
    let currentSearchId = 0; // To track the current search

    // Load enterprises
    async function loadEnterprises() {
        try {
            const res = await fetch('/api/enterprises');
            const enterprises = await res.json();
            enterpriseSelect.innerHTML = '<option value="">Select Enterprise</option>';
            enterprises.forEach(ent => {
                const option = document.createElement('option');
                option.value = ent._id;
                option.textContent = ent.tradeName || ent.legalName || 'Unnamed';
                enterpriseSelect.appendChild(option);
            });
        } catch (e) {
            alert('Failed to load enterprises');
        }
    }

    // Show loading state
    function setLoading(loading) {
        isLoading = loading;
        searchBtn.innerHTML = loading 
            ? '<div class="loading-spinner"></div>' 
            : '<i class="fas fa-search mr-2"></i>Search';
        searchBtn.disabled = loading;
        if (loading) {
            resultsTable.innerHTML = `
                <div class="p-8 text-center">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <div class="text-gray-600">Loading results...</div>
                </div>
            `;
        }
    }

    // Format response time
    function formatResponseTime(time) {
        if (!time) return '-';
        const ms = parseInt(time);
        if (ms < 100) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    }

    // Update count display
    function updateCountDisplay(countState) {
        isCountLoading = countState.loading;
        if (countState.error) {
            totalResultsEl.innerHTML = `<span class="text-red-500" title="${countState.error}">Error loading count</span>`;
        } else if (isCountLoading) {
            totalResultsEl.innerHTML = '<div class="loading-spinner inline-block w-4 h-4 mr-2"></div>Loading...';
        } else {
            totalCount = countState.count;
            totalResultsEl.textContent = totalCount.toLocaleString();
            // Update pagination
            const totalPages = Math.ceil(totalCount / pageLimit);
            pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
            prevPageBtn.disabled = currentPage <= 1;
            nextPageBtn.disabled = currentPage >= totalPages;
            currentPageEl.textContent = `${currentPage} of ${Math.ceil(totalCount / pageLimit) || 1}`;
        }
    }

    // Poll for count updates
    async function pollForCountUpdate(searchId, enterpriseId, query) {
        if (searchId !== currentSearchId) return; // Stop polling if search has changed

        try {
            const url = `/api/search/standard/${enterpriseId}/count?query=${encodeURIComponent(query)}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (searchId === currentSearchId) { // Only update if this is still the current search
                updateCountDisplay(data.countState);
                if (data.countState.loading) {
                    // Continue polling if still loading
                    setTimeout(() => pollForCountUpdate(searchId, enterpriseId, query), 1000);
                }
            }
        } catch (error) {
            console.error('Error polling for count:', error);
            if (searchId === currentSearchId) {
                updateCountDisplay({ loading: false, count: 0, error: 'Failed to load count' });
            }
        }
    }

    // Load products
    async function loadProducts(isNewSearch = false) {
        if (!selectedEnterpriseId) {
            alert('Please select an enterprise first');
            return;
        }

        if (isNewSearch) {
            currentPage = 1;
        }

        setLoading(true);
        const skip = (currentPage - 1) * pageLimit;
        const query = searchInput.value.trim();
        const startTime = performance.now();
        
        try {
            // If there's a search query, use standard search, otherwise use product list
            const endpoint = query ? 'standard' : 'products';
            const url = `/api/search/${endpoint}/${selectedEnterpriseId}?skip=${skip}&limit=${pageLimit}${query ? `&query=${encodeURIComponent(query)}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            if (data.error) {
                resultsTable.innerHTML = `<div class="p-4 text-red-500">${data.error}</div>`;
                return;
            }

            const results = data.results || [];
            
            // Handle count state for search results
            if (data.countState) {
                updateCountDisplay(data.countState);
                if (data.countState.loading) {
                    // Start polling for count updates
                    currentSearchId++;
                    pollForCountUpdate(currentSearchId, selectedEnterpriseId, query);
                }
            } else {
                // For product list, update count directly
                totalCount = data.totalCount || 0;
                totalResultsEl.textContent = totalCount.toLocaleString();
                // Update pagination
                const totalPages = Math.ceil(totalCount / pageLimit);
                pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
                prevPageBtn.disabled = currentPage <= 1;
                nextPageBtn.disabled = currentPage >= totalPages;
                currentPageEl.textContent = `${currentPage} of ${Math.ceil(totalCount / pageLimit) || 1}`;
            }

            // Update stats
            responseTimeEl.textContent = formatResponseTime(responseTime);

            // Render table
            if (results.length === 0) {
                resultsTable.innerHTML = `
                    <div class="p-8 text-center">
                        <i class="fas fa-search text-gray-400 text-4xl mb-4"></i>
                        <div class="text-gray-600">No results found</div>
                    </div>
                `;
                return;
            }

            resultsTable.innerHTML = `
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>SKU Code</th>
                            <th>Short Description</th>
                            <th>Long Description</th>
                            <th>MRP</th>
                            <th>RSP</th>
                            <th>SPP</th>
                            <th>Categories</th>
                            <th>Category IDs</th>
                            <th>Tax Category</th>
                            <th>Tax Code</th>
                            <th>UOM</th>
                            <th>UOM Type</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Updated At</th>
                            <th>Barcodes</th>
                            <th>Attributes & Policies</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(result => {
                            // List of keys already shown in dedicated columns
                            const shownKeys = new Set([
                                '_id', 'name', 'sku_code', 'short_description', 'long_description', 'mrp', 'rsp', 'spp',
                                'created_at', 'createdAt', 'updated_at', 'is_product_active', 'tax_cat_name', 'tax_cat_code',
                                'selling_uom_name', 'selling_uom_type', 'barcodes',
                                'category_name1', 'category_name2', 'category_name3', 'category_name4', 'category_name5',
                                'category_id1', 'category_id2', 'category_id3', 'category_id4', 'category_id5'
                            ]);
                            // Collect extra attributes/policies
                            const extraEntries = Object.entries(result)
                                .filter(([k, v]) => !shownKeys.has(k) && v !== undefined && v !== null && v !== '')
                                .map(([k, v]) => `<div><b>${k}:</b> ${typeof v === 'object' ? JSON.stringify(v) : v}</div>`)
                                .join('');
                            return `
                            <tr>
                                <td class="font-medium">${result.name || 'No Name'}</td>
                                <td>${result.sku_code || 'N/A'}</td>
                                <td class="max-w-xs truncate" title="${result.short_description || ''}">
                                    ${result.short_description || 'N/A'}
                                </td>
                                <td class="max-w-xs truncate" title="${result.long_description || ''}">
                                    ${result.long_description || 'N/A'}
                                </td>
                                <td>${result.mrp || 'N/A'}</td>
                                <td>${result.rsp || 'N/A'}</td>
                                <td>${result.spp || 'N/A'}</td>
                                <td class="max-w-xs truncate" title="${[
                                    result.category_name1,
                                    result.category_name2,
                                    result.category_name3,
                                    result.category_name4,
                                    result.category_name5
                                ].filter(Boolean).join(' > ')}">
                                    ${[
                                        result.category_name1,
                                        result.category_name2,
                                        result.category_name3,
                                        result.category_name4,
                                        result.category_name5
                                    ].filter(Boolean).join(' > ') || 'N/A'}
                                </td>
                                <td class="max-w-xs truncate" title="${[
                                    result.category_id1,
                                    result.category_id2,
                                    result.category_id3,
                                    result.category_id4,
                                    result.category_id5
                                ].filter(Boolean).join(', ')}">
                                    ${[
                                        result.category_id1,
                                        result.category_id2,
                                        result.category_id3,
                                        result.category_id4,
                                        result.category_id5
                                    ].filter(Boolean).join(', ') || 'N/A'}
                                </td>
                                <td class="max-w-xs truncate" title="${result.tax_cat_name || ''}">
                                    ${result.tax_cat_name || 'N/A'}
                                </td>
                                <td>${result.tax_cat_code || 'N/A'}</td>
                                <td>${result.selling_uom_name || 'N/A'}</td>
                                <td>${result.selling_uom_type || 'N/A'}</td>
                                <td>
                                    <span class="px-2 py-1 rounded-full text-xs ${result.is_product_active === '1' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                        ${result.is_product_active === '1' ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>${result.created_at ? new Date(result.created_at).toLocaleString() : 'N/A'}</td>
                                <td>${result.updated_at ? new Date(result.updated_at).toLocaleString() : 'N/A'}</td>
                                <td class="max-w-xs truncate" title="${Array.isArray(result.barcodes) ? result.barcodes.map(b => b.barcode).join(', ') : ''}">
                                    ${Array.isArray(result.barcodes) && result.barcodes.length > 0 ? result.barcodes.map(b => b.barcode).join(', ') : 'N/A'}
                                </td>
                                <td class="max-w-xs truncate" title="${extraEntries.replace(/<[^>]+>/g, ' ')}">
                                    <div class="overflow-auto max-h-32">${extraEntries || 'N/A'}</div>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } catch (e) {
            resultsTable.innerHTML = `
                <div class="p-8 text-center">
                    <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
                    <div class="text-red-500">Failed to load products</div>
                </div>
            `;
        } finally {
            setLoading(false);
        }
    }

    // Event Listeners
    enterpriseSelect.addEventListener('change', (e) => {
        selectedEnterpriseId = e.target.value;
        if (selectedEnterpriseId) {
            loadProducts(true);
        }
    });

    searchBtn.addEventListener('click', () => loadProducts(true));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadProducts(true);
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1 && !isLoading) {
            currentPage--;
            loadProducts();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        if (currentPage * pageLimit < totalCount && !isLoading) {
            currentPage++;
            loadProducts();
        }
    });

    // Initial load
    loadEnterprises();
}); 