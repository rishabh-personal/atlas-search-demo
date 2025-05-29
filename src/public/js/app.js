document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const enterpriseSelect = document.getElementById('enterpriseSelect');
    const searchTypeGrid = document.getElementById('searchTypeGrid');
    const drawer = document.getElementById('searchDrawer');
    const drawerBackdrop = document.getElementById('drawerBackdrop');
    const drawerTitle = document.getElementById('drawerTitle');
    const drawerContent = document.getElementById('drawerContent');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');

    let selectedEnterpriseId = '';
    let currentSearchType = '';
    let standardPage = 1;
    let standardLimit = 20;
    let standardTotalCount = 0;
    let standardQuery = '';

    // --- Enterprise Dropdown ---
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
    loadEnterprises();
    enterpriseSelect.addEventListener('change', (e) => {
        selectedEnterpriseId = e.target.value;
        closeDrawer();
    });

    // --- Drawer Logic ---
    function openDrawer(type) {
        currentSearchType = type;
        drawer.classList.add('open');
        drawerBackdrop.classList.add('open');
        renderDrawerContent(type);
    }
    function closeDrawer() {
        drawer.classList.remove('open');
        drawerBackdrop.classList.remove('open');
        drawerContent.innerHTML = '';
        currentSearchType = '';
        standardPage = 1;
        standardQuery = '';
    }
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerBackdrop.addEventListener('click', closeDrawer);

    // --- Card Clicks ---
    document.querySelectorAll('.search-type-card').forEach(card => {
        card.addEventListener('click', () => {
            if (!selectedEnterpriseId) {
                alert('Please select an enterprise first.');
                return;
            }
            openDrawer(card.getAttribute('data-type'));
        });
    });

    // --- Drawer Content Rendering ---
    function renderDrawerContent(type) {
        let label = '';
        let placeholder = '';
        let showPagination = false;
        switch (type) {
            case 'autocomplete':
                label = 'Autocomplete Search';
                placeholder = 'Type to autocomplete...';
                break;
            case 'standard':
                label = 'Standard Search';
                placeholder = 'Type to search...';
                showPagination = true;
                break;
            case 'fuzzy':
                label = 'Fuzzy Search';
                placeholder = 'Type to fuzzy search...';
                break;
            case 'text':
                label = 'Text Search';
                placeholder = 'Type to text search...';
                break;
            case 'wildcard':
                label = 'Wildcard Search';
                placeholder = 'Type to wildcard search...';
                break;
            case 'regex':
                label = 'Regex Search';
                placeholder = 'Type regex pattern...';
                break;
            case 'term':
                label = 'Term Search';
                placeholder = 'Type to exact match...';
                break;
            case 'products':
                label = 'Product List';
                placeholder = 'Search products... (optional)';
                showPagination = true;
                break;
        }
        drawerTitle.textContent = label;
        drawerContent.innerHTML = `
            <div class="mb-4">
                <input id="drawerSearchInput" type="text" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="${placeholder}">
            </div>
            <div class="mb-4">
                <button id="drawerSearchBtn" class="px-4 py-2 bg-blue-500 text-white rounded-lg">Search</button>
                <span id="drawerLoader" class="ml-2 text-blue-500 hidden">Loading...</span>
            </div>
            <div id="drawerMeta" class="metadata mb-2"></div>
            <div id="drawerResults" class="space-y-4"></div>
            ${showPagination ? `
            <div class="flex justify-between items-center mt-4">
                <button id="drawerPrevPage" class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Prev</button>
                <span id="drawerPageInfo"></span>
                <button id="drawerNextPage" class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Next</button>
            </div>
            ` : ''}
        `;
        document.getElementById('drawerSearchBtn').addEventListener('click', () => handleDrawerSearch(type));
        document.getElementById('drawerSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleDrawerSearch(type);
        });
        if (showPagination) {
            document.getElementById('drawerPrevPage').addEventListener('click', () => {
                if (standardPage > 1) {
                    standardPage--;
                    handleDrawerSearch(type, true);
                }
            });
            document.getElementById('drawerNextPage').addEventListener('click', () => {
                if (standardPage * standardLimit < standardTotalCount) {
                    standardPage++;
                    handleDrawerSearch(type, true);
                }
            });
        }
        if (type === 'products') {
            handleDrawerSearch('products');
        }
    }

    // --- Search Logic ---
    async function handleDrawerSearch(type, isPaginate = false) {
        const input = document.getElementById('drawerSearchInput');
        const loader = document.getElementById('drawerLoader');
        const resultsDiv = document.getElementById('drawerResults');
        const metaDiv = document.getElementById('drawerMeta');
        const pageInfo = document.getElementById('drawerPageInfo');
        let query = input.value.trim();
        if (!isPaginate) {
            standardPage = 1;
        }
        if (type === 'standard' || type === 'products') {
            standardQuery = query;
        }
        if (!query && type !== 'products' && type !== 'standard') {
            resultsDiv.innerHTML = '<div class="text-red-500">Please enter a search query.</div>';
            metaDiv.innerHTML = '';
            if (pageInfo) pageInfo.textContent = '';
            return;
        }
        loader.classList.remove('hidden');
        resultsDiv.innerHTML = '';
        metaDiv.innerHTML = '';
        if (pageInfo) pageInfo.textContent = '';
        let url = `/api/search/${type === 'products' ? 'products' : type}/${selectedEnterpriseId}?`;
        if (type === 'products') {
            const skip = (standardPage - 1) * standardLimit;
            url += `skip=${skip}&limit=${standardLimit}`;
            if (query) url += `&query=${encodeURIComponent(query)}`;
        } else if (type === 'standard') {
            const skip = (standardPage - 1) * standardLimit;
            url += `query=${encodeURIComponent(query)}&skip=${skip}&limit=${standardLimit}`;
        } else {
            url += `query=${encodeURIComponent(query)}`;
        }
        try {
            const res = await fetch(url);
            const data = await res.json();
            loader.classList.add('hidden');
            if (data.error) {
                resultsDiv.innerHTML = `<div class='text-red-500'>${data.error}</div>`;
                metaDiv.innerHTML = '';
                if (pageInfo) pageInfo.textContent = '';
                return;
            }
            let results = data.results || [];
            let metaHtml = `<div>Response Time: ${data.metadata?.responseTime || 'N/A'}</div><div>Results Count: ${results.length}${data.totalCount ? ' / ' + data.totalCount : ''}</div>`;
            metaDiv.innerHTML = metaHtml;
            if (type === 'standard' || type === 'products') {
                standardTotalCount = data.totalCount || 0;
                if (pageInfo) pageInfo.textContent = `Page: ${standardPage} / ${Math.ceil(standardTotalCount / standardLimit) || 1}`;
            }
            if (!results.length) {
                resultsDiv.innerHTML = '<div class="text-gray-500">No results found</div>';
                return;
            }
            results.forEach(result => renderResultCard(result));
        } catch (e) {
            loader.classList.add('hidden');
            resultsDiv.innerHTML = '<div class="text-red-500">Search failed.</div>';
            if (pageInfo) pageInfo.textContent = '';
        }
    }

    function renderResultCard(result) {
        // If this is the first result, create the table header
        if (document.querySelector('#drawerResults table') === null) {
            document.querySelector('#drawerResults').innerHTML = `
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>SKU</th>
                            <th>Description</th>
                            <th>Price</th>
                            <th>Score</th>
                            <th>Categories</th>
                        </tr>
                    </thead>
                    <tbody id="resultsTableBody"></tbody>
                </table>
            `;
        }

        // Create a table row for the result
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-medium">${result.name || 'No Name'}</td>
            <td>${result.sku_code || 'N/A'}</td>
            <td class="max-w-xs truncate">${result.short_description || 'N/A'}</td>
            <td>${result.mrp || 'N/A'}</td>
            <td>${result.score?.toFixed(2) || 'N/A'}</td>
            <td class="max-w-xs truncate">${[
                result.category_name1,
                result.category_name2,
                result.category_name3,
                result.category_name4,
                result.category_name5
            ].filter(Boolean).join(' > ')}</td>
        `;

        document.querySelector('#resultsTableBody').appendChild(tr);
        return ''; // Return empty string since we're directly manipulating the DOM
    }
}); 