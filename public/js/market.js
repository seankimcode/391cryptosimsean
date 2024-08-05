document.addEventListener('DOMContentLoaded', async () => {
    // Fetch market data from CoinGecko API
    const fetchMarketData = async () => {
        try {
            const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 10,
                    page: 1,
                    sparkline: true,
                    x_cg_demo_api_key: 'CG-GWH6d4aEUY66FHYcP3WMP8c1'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching market data:', error);
            return [];
        }
    };

    // Initialize chart
    const initializeChart = (canvasId, sparklineData, label) => {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: sparklineData.map((_, index) => index),
                datasets: [{
                    label: label,
                    data: sparklineData,
                    borderColor: '#4caf50',
                    fill: false,
                    pointRadius: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                elements: {
                    line: {
                        tension: 0.1
                    }
                }
            }
        });
    };

    const marketData = await fetchMarketData();
    const marketDataContainer = document.getElementById('marketData');
    marketDataContainer.innerHTML = '';

    marketData.forEach((crypto, index) => {
        const cryptoDiv = document.createElement('div');
        cryptoDiv.className = 'crypto';

        cryptoDiv.innerHTML = `
            <h3>${crypto.name} (${crypto.symbol.toUpperCase()})</h3>
            <p>Price: $${crypto.current_price.toLocaleString()}</p>
            <p>Change: ${crypto.price_change_percentage_24h.toFixed(2)}%</p>
            <div class="chart-container">
                <canvas id="${crypto.id}Chart"></canvas>
            </div>
        `;

        marketDataContainer.appendChild(cryptoDiv);

        // Initialize small chart
        initializeChart(`${crypto.id}Chart`, crypto.sparkline_in_7d.price, crypto.name);
    });
});
