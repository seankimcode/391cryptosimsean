// Initialize Firebase
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firebase Authentication
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
    loadBalance();
}

// Show the specified page and hide others
window.showPage = function(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    if (pageId === 'trade_div') {
        loadBalance();
    }
}

// Normalize cryptocurrency names
function normalizeCryptoName(name) {
    const mapping = {
        'btc': 'bitcoin',
        'bitcoin': 'bitcoin',
        'eth': 'ethereum',
        'ethereum': 'ethereum'
        // Add more mappings as needed
    };
    return mapping[name.toLowerCase()] || name.toLowerCase();
}

// Fetch data from CoinGecko API
async function fetchCryptoPrice(crypto) {
    const normalizedCrypto = normalizeCryptoName(crypto);
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${normalizedCrypto}&vs_currencies=usd`);
    const data = await response.json();
    console.log(`Response for ${crypto}:`, data); // Log the response for debugging
    if (!data[normalizedCrypto] || !data[normalizedCrypto].usd) {
        throw new Error(`No price data found for ${crypto}`);
    }
    return data[normalizedCrypto].usd;
}

// Fetch data for all cryptos in the portfolio
async function fetchPortfolioPrices(portfolio) {
    const prices = {};
    for (const crypto in portfolio) {
        try {
            const normalizedCrypto = normalizeCryptoName(crypto);
            prices[crypto] = await fetchCryptoPrice(normalizedCrypto);
        } catch (error) {
            console.error(error.message);
            prices[crypto] = 0; // Handle the case where the price is not available
        }
    }
    return prices;
}

// Add portfolio management functions
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

    for (const [crypto, data] of Object.entries(portfolioData)) {
        const amount = data.amount;
        const purchasePrice = data.purchasePrice;
        const currentPrice = prices[normalizeCryptoName(crypto)];
        const currentValue = amount * currentPrice;
        const purchaseValue = amount * purchasePrice;
        const profitLoss = currentValue - purchaseValue;
        const profitLossText = profitLoss >= 0 ? `Profit: $${profitLoss.toFixed(2)}` : `Loss: $${(-profitLoss).toFixed(2)}`;

        const item = document.createElement('div');
        if (amount && purchasePrice && currentPrice) {
            item.innerHTML = `${crypto}: ${amount} (${currentValue.toFixed(2)} USD) - ${profitLossText}`;
        } else {
            item.innerHTML = `${crypto}: ${amount} (Price data unavailable)`;
        }
        portfolioContent.appendChild(item);
    }

    // Update portfolio chart
    updatePortfolioChart(portfolioData, prices);
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
        displayPortfolio(portfolioData, prices);
        addTradeToHistory(crypto, amount, purchasePrice);
        updateBalance(-amount * purchasePrice); // Deduct the cost from the balance
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
                if (data.purchasePrice) {
                    const item = document.createElement('div');
                    item.innerText = `Traded ${data.amount} of ${data.crypto} on ${data.timestamp.toDate().toLocaleString()} at $${data.purchasePrice.toFixed(2)} USD`;
                    tradeHistory.appendChild(item);
                }
            });
        });
    } else {
        console.log("No user logged in.");
    }
}

// Portfolio chart
let portfolioChart;
function updatePortfolioChart(portfolioData, prices) {
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    const labels = Object.keys(portfolioData);
    const data = labels.map(label => {
        const normalizedLabel = normalizeCryptoName(label);
        return portfolioData[normalizedLabel].amount * prices[normalizedLabel];
    });

    // Destroy the existing chart instance if it exists
    if (portfolioChart) {
        portfolioChart.destroy();
    }

    portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Portfolio Value Over Time',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'MMM d', // Change `MMM D` to `MMM d`
                        displayFormats: {
                            day: 'MMM d' // Change `MMM D` to `MMM d`
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
                            return `Value: $${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

// Refresh portfolio prices every hour
setInterval(loadPortfolio, 3600000);

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

onAuthStateChanged(auth, (user) => {
    if (user) {
        showAuthenticatedUI();
        loadPortfolio();
    } else {
        document.getElementById('login_div').style.display = 'block';
        document.getElementById('app').style.display = 'none';
    }
});
