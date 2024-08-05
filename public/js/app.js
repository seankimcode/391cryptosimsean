import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyDl35KtU9I_qL2_UUSiwi1ckfw6kmvsRyY",
    authDomain: "cryptosimsean.firebaseapp.com",
    projectId: "cryptosimsean",
    storageBucket: "cryptosimsean.appspot.com",
    messagingSenderId: "205429209021",
    appId: "1:205429209021:web:2f0a0a9c62eb4e2f03c9a7",
    measurementId: "G-X8X1VZQEX8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.createAccount = async function() {
    const email = document.getElementById('email_field').value;
    const password = document.getElementById('password_field').value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Account created successfully!');
        showAuthenticatedUI();
    } catch (error) {
        alert('Error creating account: ' + error.message);
    }
}

window.login = async function() {
    const email = document.getElementById('email_field').value;
    const password = document.getElementById('password_field').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert('Logged in successfully!');
        showAuthenticatedUI();
    } catch (error) {
        alert('Error logging in: ' + error.message);
    }
}

window.logout = async function() {
    try {
        await signOut(auth);
        alert('Logged out successfully!');
        document.getElementById('login_div').style.display = 'block';
        document.getElementById('app').style.display = 'none';
    } catch (error) {
        alert('Error logging out: ' + error.message);
    }
}

function showAuthenticatedUI() {
    document.getElementById('login_div').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    showPage('portfolio_div');
    loadPortfolio();
    loadTradeHistory();
    loadSellHistory();
    loadBalance();
    loadNews();
    loadPortfolioHistory();
}

window.showPage = function(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    if (pageId === 'trade_div') {
        loadBalance();
    }
}

function normalizeCryptoName(name) {
    const mapping = {
        'btc': 'bitcoin',
        'bitcoin': 'bitcoin',
        'eth': 'ethereum',
        'ethereum': 'ethereum'
    };
    return mapping[name.toLowerCase()] || name.toLowerCase();
}

// Define a cache object
const priceCache = {};

// Set cache expiration time (in milliseconds)
const cacheExpiration = 60000; // 1 minute

function getCachedPrice(crypto) {
    const cachedData = priceCache[crypto];
    if (cachedData) {
        const now = new Date().getTime();
        if (now - cachedData.timestamp < cacheExpiration) {
            return cachedData.price;
        } else {
            delete priceCache[crypto];
        }
    }
    return null;
}

function setCachedPrice(crypto, price) {
    const now = new Date().getTime();
    priceCache[crypto] = {
        price: price,
        timestamp: now
    };
}

const apiKey = 'CG-GWH6d4aEUY66FHYcP3WMP8c1';

async function fetchCryptoPrice(crypto) {
    const cachedPrice = getCachedPrice(crypto);
    if (cachedPrice !== null) {
        return cachedPrice;
    }

    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: crypto,
                vs_currencies: 'usd',
                x_cg_demo_api_key: apiKey
            }
        });
        const price = response.data[crypto].usd;
        setCachedPrice(crypto, price);
        return price;
    } catch (error) {
        console.error('Error fetching data:', error);
        return 0;
    }
}

async function fetchPortfolioPrices(portfolio) {
    const prices = {};
    for (const crypto in portfolio) {
        try {
            const normalizedCrypto = normalizeCryptoName(crypto);
            prices[crypto] = await fetchCryptoPrice(normalizedCrypto);
        } catch (error) {
            console.error(error.message);
            prices[crypto] = 0;
        }
    }
    return prices;
}

async function loadPortfolio() {
    const user = auth.currentUser;
    if (user) {
        const portfolioRef = doc(db, "portfolios", user.uid);
        const portfolioDoc = await getDoc(portfolioRef);

        if (portfolioDoc.exists()) {
            const portfolioData = portfolioDoc.data();
            const prices = await fetchPortfolioPrices(portfolioData);
            displayPortfolio(portfolioData, prices);
        } else {
            console.log("No portfolio found.");
            document.getElementById('portfolio_content').innerText = "No portfolio found.";
        }
    } else {
        console.log("No user logged in.");
    }
}

function displayPortfolio(portfolioData, prices) {
    const portfolioContent = document.getElementById('portfolio_content');
    portfolioContent.innerHTML = '';

    let totalPortfolioValue = 0; // Initialize total portfolio value
    const portfolioEntries = []; // Array to store portfolio entries for sorting

    for (const [crypto, data] of Object.entries(portfolioData)) {
        const amount = data.amount;
        const purchasePrice = data.purchasePrice;
        const currentPrice = prices[normalizeCryptoName(crypto)];
        const currentValue = amount * currentPrice;
        const purchaseValue = amount * purchasePrice;
        const profitLoss = currentValue - purchaseValue;
        const profitLossText = profitLoss >= 0 ? `Profit: $${profitLoss.toFixed(2)}` : `Loss: $${(-profitLoss).toFixed(2)}`;

        totalPortfolioValue += currentValue; // Add to total portfolio value

        // Push portfolio entry to array for sorting
        portfolioEntries.push({
            crypto: crypto,
            amount: amount,
            currentValue: currentValue,
            profitLossText: profitLossText
        });
    }

    // Sort portfolio entries by current value from biggest to smallest
    portfolioEntries.sort((a, b) => b.currentValue - a.currentValue);

    // Append sorted portfolio entries to the table
    portfolioEntries.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.crypto}</td>
            <td>${entry.amount}</td>
            <td>${entry.currentValue.toFixed(2)} USD</td>
            <td>${entry.profitLossText}</td>
        `;
        portfolioContent.appendChild(row);
    });

    // Display total portfolio value
    const totalValueDiv = document.getElementById('total_portfolio_value');
    totalValueDiv.innerHTML = `<strong>Total Portfolio Value: $${totalPortfolioValue.toFixed(2)}</strong>`;

    updatePortfolioChart(totalPortfolioValue);
}

async function updatePortfolioValueHistory(totalPortfolioValue) {
    const user = auth.currentUser;
    if (user) {
        const portfolioHistoryRef = collection(db, "portfolioHistory", user.uid, "history");
        await addDoc(portfolioHistoryRef, {
            value: totalPortfolioValue,
            timestamp: new Date()
        });
    }
}

async function loadPortfolioHistory() {
    const user = auth.currentUser;
    if (user) {
        const portfolioHistoryRef = collection(db, "portfolioHistory", user.uid, "history");
        const q = query(portfolioHistoryRef, orderBy("timestamp", "asc"));
        onSnapshot(q, (querySnapshot) => {
            portfolioDataPoints.length = 0; // Clear existing data points
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                portfolioDataPoints.push({
                    x: data.timestamp.toDate(),
                    y: data.value
                });
            });
            updatePortfolioChart();
        });
    } else {
        console.log("No user logged in.");
    }
}

async function updatePortfolio(crypto, amount, purchasePrice) {
    const user = auth.currentUser;
    if (user) {
        const portfolioRef = doc(db, "portfolios", user.uid);
        const portfolioDoc = await getDoc(portfolioRef);
        let portfolioData = {};
        if (portfolioDoc.exists()) {
            portfolioData = portfolioDoc.data();
        }
        const normalizedCrypto = normalizeCryptoName(crypto);
        if (portfolioData[normalizedCrypto]) {
            portfolioData[normalizedCrypto].amount += amount;
        } else {
            portfolioData[normalizedCrypto] = {
                amount: amount,
                purchasePrice: purchasePrice
            };
        }
        await setDoc(portfolioRef, portfolioData);
        const prices = await fetchPortfolioPrices(portfolioData);
        
        // Calculate total portfolio value
        let totalPortfolioValue = 0;
        for (const [crypto, data] of Object.entries(portfolioData)) {
            const currentPrice = prices[normalizeCryptoName(crypto)];
            const currentValue = data.amount * currentPrice;
            totalPortfolioValue += currentValue;
        }

        displayPortfolio(portfolioData, prices);
        addTradeToHistory(crypto, amount, purchasePrice);
        updateBalance(-amount * purchasePrice);

        // Update Firestore with the new total portfolio value
        await updatePortfolioValueHistory(totalPortfolioValue);
    } else {
        console.log("No user logged in.");
    }
}


window.performTrade = async function(event) {
    event.preventDefault();
    const crypto = document.getElementById('crypto').value.toLowerCase();
    const amount = parseFloat(document.getElementById('amount').value);

    if (crypto && !isNaN(amount)) {
        const purchasePrice = await fetchCryptoPrice(crypto);
        const cost = amount * purchasePrice;
        const user = auth.currentUser;
        const balanceRef = doc(db, "balances", user.uid);
        const balanceDoc = await getDoc(balanceRef);
        let currentBalance = 0;
        if (balanceDoc.exists()) {
            currentBalance = balanceDoc.data().balance;
        }

        if (currentBalance >= cost) {
            await updatePortfolio(crypto, amount, purchasePrice);
            alert('Trade successful!');
        } else {
            alert('Insufficient balance.');
        }
    } else {
        alert('Invalid trade details.');
    }
}

function addTradeToHistory(crypto, amount, purchasePrice) {
    const user = auth.currentUser;
    if (user) {
        const tradeHistoryRef = collection(db, "tradeHistory", user.uid, "history");
        addDoc(tradeHistoryRef, {
            crypto: crypto,
            amount: amount,
            purchasePrice: purchasePrice,
            timestamp: new Date()
        });
    }
}

async function loadTradeHistory() {
    const user = auth.currentUser;
    if (user) {
        const tradeHistoryRef = collection(db, "tradeHistory", user.uid, "history");
        const q = query(tradeHistoryRef, orderBy("timestamp", "asc"));
        onSnapshot(q, (querySnapshot) => {
            const tradeHistory = document.getElementById('trade_history');
            tradeHistory.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const item = document.createElement('div');
                if (data.purchasePrice) {
                    item.innerText = `Traded ${data.amount} of ${data.crypto} on ${data.timestamp.toDate().toLocaleString()} at $${data.purchasePrice.toFixed(2)} USD`;
                } else {
                    item.innerText = `Traded ${data.amount} of ${data.crypto} on ${data.timestamp.toDate().toLocaleString()}`;
                }
                tradeHistory.appendChild(item);
            });
        });
    } else {
        console.log("No user logged in.");
    }
}

async function loadSellHistory() {
    const user = auth.currentUser;
    if (user) {
        const sellHistoryRef = collection(db, "sellHistory", user.uid, "history");
        const q = query(sellHistoryRef, orderBy("timestamp", "asc"));
        onSnapshot(q, (querySnapshot) => {
            const sellHistory = document.getElementById('sell_history');
            sellHistory.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const item = document.createElement('div');
                if (data.sellPrice) {
                    item.innerText = `Sold ${data.amount} of ${data.crypto} on ${data.timestamp.toDate().toLocaleString()} at $${data.sellPrice.toFixed(2)} USD`;
                } else {
                    item.innerText = `Sold ${data.amount} of ${data.crypto} on ${data.timestamp.toDate().toLocaleString()}`;
                }
                sellHistory.appendChild(item);
            });
        });
    } else {
        console.log("No user logged in.");
    }
}

let portfolioChart;
const portfolioDataPoints = [];

function updatePortfolioChart() {
    const ctx = document.getElementById('portfolioChart').getContext('2d');

    if (portfolioChart) {
        portfolioChart.destroy();
    }

    portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Portfolio Value Over Time',
                data: portfolioDataPoints,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false,
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'MMM d, HH:mm', // Format for the tooltip
                        displayFormats: {
                            day: 'MMM d'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Portfolio Value (USD)'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const date = new Date(context.raw.x);
                            const value = context.raw.y.toFixed(2);
                            const dateString = date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                            return `Value: $${value} at ${dateString}`;
                        }
                    }
                }
            }
        }
    });
}

async function loadBalance() {
    const user = auth.currentUser;
    if (user) {
        const balanceRef = doc(db, "balances", user.uid);
        const balanceDoc = await getDoc(balanceRef);
        let currentBalance = 0;
        if (balanceDoc.exists()) {
            currentBalance = balanceDoc.data().balance;
        }
        document.getElementById('balance_content').innerText = `Balance: $${currentBalance.toFixed(2)}`;
        document.getElementById('balance_trade_content').innerText = `Balance: $${currentBalance.toFixed(2)}`;
    } else {
        console.log("No user logged in.");
    }
}

window.performDeposit = async function(event) {
    event.preventDefault();
    const amount = parseFloat(document.getElementById('deposit_amount').value);

    if (!isNaN(amount) && amount > 0) {
        updateBalance(amount);
        alert('Deposit successful!');
    } else {
        alert('Invalid deposit amount.');
    }
}

async function updateBalance(amount) {
    const user = auth.currentUser;
    if (user) {
        const balanceRef = doc(db, "balances", user.uid);
        const balanceDoc = await getDoc(balanceRef);
        let currentBalance = 0;
        if (balanceDoc.exists()) {
            currentBalance = balanceDoc.data().balance;
        }
        currentBalance += amount;
        await setDoc(balanceRef, { balance: currentBalance });
        loadBalance();
    } else {
        console.log("No user logged in.");
    }
}

window.clearBalance = async function() {
    const user = auth.currentUser;
    if (user) {
        const balanceRef = doc(db, "balances", user.uid);
        await setDoc(balanceRef, { balance: 0 });
        loadBalance();
        alert('Balance cleared!');
    } else {
        console.log("No user logged in.");
    }
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        showAuthenticatedUI();
        loadPortfolio();
    } else {
        document.getElementById('login_div').style.display = 'block';
        document.getElementById('app').style.display = 'none';
    }
});

window.performSell = async function(event) {
    event.preventDefault();
    const crypto = document.getElementById('sell_crypto').value.toLowerCase();
    const amount = parseFloat(document.getElementById('sell_amount').value);

    if (crypto && !isNaN(amount)) {
        const normalizedCrypto = normalizeCryptoName(crypto);
        const user = auth.currentUser;
        const portfolioRef = doc(db, "portfolios", user.uid);
        const portfolioDoc = await getDoc(portfolioRef);
        let portfolioData = {};
        if (portfolioDoc.exists()) {
            portfolioData = portfolioDoc.data();
        } else {
            alert('No portfolio found.');
            return;
        }

        if (portfolioData[normalizedCrypto] && portfolioData[normalizedCrypto].amount >= amount) {
            const sellPrice = await fetchCryptoPrice(crypto);
            portfolioData[normalizedCrypto].amount -= amount;
            if (portfolioData[normalizedCrypto].amount <= 0) {
                delete portfolioData[normalizedCrypto];
            }
            await setDoc(portfolioRef, portfolioData);
            await updateBalance(amount * sellPrice);
            const prices = await fetchPortfolioPrices(portfolioData);
            
            // Calculate total portfolio value
            let totalPortfolioValue = 0;
            for (const [crypto, data] of Object.entries(portfolioData)) {
                const currentPrice = prices[normalizeCryptoName(crypto)];
                const currentValue = data.amount * currentPrice;
                totalPortfolioValue += currentValue;
            }

            displayPortfolio(portfolioData, prices);
            addSellToHistory(crypto, amount, sellPrice);
            alert('Sell successful!');
            await updatePortfolioValueHistory(totalPortfolioValue);
        } else {
            alert('Insufficient amount in portfolio.');
        }
    } else {
        alert('Invalid sell details.');
    }
}


function addSellToHistory(crypto, amount, sellPrice) {
    const user = auth.currentUser;
    if (user) {
        const sellHistoryRef = collection(db, "sellHistory", user.uid, "history");
        addDoc(sellHistoryRef, {
            crypto: crypto,
            amount: amount,
            sellPrice: sellPrice,
            timestamp: new Date()
        });
    }
}

window.loadNews = async function() {
    const newsContent = document.getElementById('news_content');
    newsContent.innerHTML = 'Loading news...';

    try {
        const response = await fetch('https://cryptonews-api.com/api/v1/category?section=general&items=3&page=1&token=y6286ua8i4y7rob3hodj6tsjgq5nxnl1ldukmwp0');
        const data = await response.json();
        displayNews(data.data);
    } catch (error) {
        console.error('Error fetching news:', error);
    }
}

function displayNews(newsData) {
    const newsContent = document.getElementById('news_content');
    newsContent.innerHTML = '';

    newsData.forEach(news => {
        const newsItem = document.createElement('div');
        newsItem.classList.add('news-item', 'mb-4');

        const newsImage = news.image_url ? `<img src="${news.image_url}" alt="${news.title}" class="img-fluid mb-2"/>` : '';

        newsItem.innerHTML = `
            ${newsImage}
            <h4>${news.title}</h4>
            <p>${news.text}</p>
            <small class="text-muted">${news.source_name} - ${news.date}</small>
            <br>
            <a href="${news.news_url}" target="_blank">Read more</a>
        `;
        newsContent.appendChild(newsItem);
    });
}