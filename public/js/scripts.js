// Initialize Firebase
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Firebase Authentication
function createAccount() {
    const email = document.getElementById('email_field').value;
    const password = document.getElementById('password_field').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert('Account created successfully!');
            showAuthenticatedUI();
        })
        .catch((error) => {
            alert('Error creating account: ' + error.message);
        });
}

function login() {
    const email = document.getElementById('email_field').value;
    const password = document.getElementById('password_field').value;

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            alert('Logged in successfully!');
            showAuthenticatedUI();
        })
        .catch((error) => {
            alert('Error logging in: ' + error.message);
        });
}

function logout() {
    auth.signOut().then(() => {
        alert('Logged out successfully!');
        document.getElementById('login_div').style.display = 'block';
        document.getElementById('app').style.display = 'none';
    }).catch((error) => {
        alert('Error logging out: ' + error.message);
    });
}

function showAuthenticatedUI() {
    document.getElementById('login_div').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    showPage('portfolio_div');
    loadPortfolio();
    loadTradeHistory();
}

// Fetch data from CoinGecko API
async function fetchCryptoPrice(crypto) {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd`);
    const data = await response.json();
    if (data[crypto] && data[crypto].usd) {
        return data[crypto].usd;
    } else {
        console.error(`Failed to fetch price for ${crypto}`);
        return null; // or handle the error as needed
    }
}

// Fetch data for all cryptos in the portfolio
async function fetchPortfolioPrices(portfolio) {
    const prices = {};
    for (const crypto in portfolio) {
        prices[crypto] = await fetchCryptoPrice(crypto);
    }
    return prices;
}

// Show the specified page and hide others
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
}

// Add portfolio management functions
async function loadPortfolio() {
    const user = auth.currentUser;
    if (user) {
        const portfolioRef = db.collection("portfolios").doc(user.uid);
        const portfolioDoc = await portfolioRef.get();

        if (portfolioDoc.exists()) {
            const portfolioData = portfolioDoc.data();
            const prices = await fetchPortfolioPrices(portfolioData);
            displayPortfolio(portfolioData, prices);
            await updatePortfolioChart();
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

    let totalValue = 0;

    for (const [crypto, amount] of Object.entries(portfolioData)) {
        const value = amount * prices[crypto];
        totalValue += value;

        const item = document.createElement('div');
        item.innerText = `${crypto}: ${amount} (${value.toFixed(2)} USD)`;
        portfolioContent.appendChild(item);
    }

    const totalValueItem = document.createElement('div');
    totalValueItem.innerText = `Total Portfolio Value: ${totalValue.toFixed(2)} USD`;
    portfolioContent.appendChild(totalValueItem);

    // Save the total portfolio value to the database for history tracking
    savePortfolioHistory(totalValue);
}

async function savePortfolioHistory(totalValue) {
    const user = auth.currentUser;
    if (user) {
        const historyRef = db.collection("portfolioHistory").doc(user.uid);
        const timestamp = new Date().toISOString();
        await historyRef.set({
            [timestamp]: totalValue
        }, { merge: true });
    }
}

async function fetchHistoricalPortfolioData() {
    const user = auth.currentUser;
    if (user) {
        const historyRef = db.collection("portfolioHistory").doc(user.uid);
        const historyDoc = await historyRef.get();
        if (historyDoc.exists()) {
            const historyData = historyDoc.data();
            return Object.entries(historyData).map(([timestamp, totalValue]) => ({
                timestamp: new Date(timestamp),
                totalValue
            }));
        }
    }
    return [];
}

async function updatePortfolioChart() {
    const historyData = await fetchHistoricalPortfolioData();
    if (historyData.length === 0) {
        console.log("No historical data available.");
        return;
    }

    const labels = historyData.map(entry => entry.timestamp.toDateString());
    const data = historyData.map(entry => entry.totalValue);

    const ctx = document.getElementById('portfolioChart').getContext('2d');
    if (window.portfolioChart) {
        window.portfolioChart.destroy();
    }
    window.portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Portfolio Value',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                fill: false
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'll',
                        displayFormats: {
                            day: 'MMM D'
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

async function updatePortfolio(crypto, amount) {
    const user = auth.currentUser;
    if (user) {
        const portfolioRef = db.collection("portfolios").doc(user.uid);
        const portfolioDoc = await portfolioRef.get();
        let portfolioData = {};
        if (portfolioDoc.exists()) {
            portfolioData = portfolioDoc.data();
        }
        if (portfolioData[crypto]) {
            portfolioData[crypto] += amount;
        } else {
            portfolioData[crypto] = amount;
        }
        await portfolioRef.set(portfolioData);
        const prices = await fetchPortfolioPrices(portfolioData);
        displayPortfolio(portfolioData, prices);
        addTradeToHistory(crypto, amount);
        await updatePortfolioChart();
    } else {
        console.log("No user logged in.");
    }
}

async function performTrade(event) {
    event.preventDefault();
    const crypto = document.getElementById('crypto').value.toLowerCase();
    const amount = parseFloat(document.getElementById('amount').value);

    if (crypto && !isNaN(amount)) {
        await updatePortfolio(crypto, amount);
        alert('Trade successful!');
    } else {
        alert('Invalid trade details.');
    }
}

function addTradeToHistory(crypto, amount) {
    const user = auth.currentUser;
    if (user) {
        const tradeHistoryRef = db.collection("tradeHistory").doc(user.uid).collection("history");
        tradeHistoryRef.add({
            crypto: crypto,
            amount: amount,
            timestamp: firebase.firestore.Timestamp.now()
        });
    }
}

async function loadTradeHistory() {
    const user = auth.currentUser;
    if (user) {
        const tradeHistoryRef = db.collection("tradeHistory").doc(user.uid).collection("history");
        const q = tradeHistoryRef.orderBy("timestamp", "asc");
        q.onSnapshot((querySnapshot) => {
            const tradeHistory = document.getElementById('trade_history');
            tradeHistory.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const item = document.createElement('div');
                item.innerText = `Traded ${data.amount} of ${data.crypto} on ${data.timestamp.toDate().toLocaleString()}`;
                tradeHistory.appendChild(item);
            });
        });
    } else {
        console.log("No user logged in.");
    }
}

// Refresh portfolio prices every hour
setInterval(loadPortfolio, 3600000);

auth.onAuthStateChanged((user) => {
    if (user) {
        showAuthenticatedUI();
        loadPortfolio();
    } else {
        document.getElementById('login_div').style.display = 'block';
        document.getElementById('app').style.display = 'none';
    }
});
