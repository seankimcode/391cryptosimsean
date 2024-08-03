// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyADCqo7EBWYjwUkP_AQrF69hqA9hj4NEKc",
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
            document.getElementById('portfolioData').innerText = "No portfolio found.";
        }
    } else {
        console.log("No user logged in.");
    }
}

function displayPortfolio(portfolioData, prices) {
    const portfolioContent = document.getElementById('portfolioData');
    portfolioContent.innerHTML = '';

    let totalValue = 0;

    for (const [crypto, amount] of Object.entries(portfolioData)) {
        const value = amount * prices[crypto];
        totalValue += value;

        const item = document.createElement('div');
        item.classList.add('crypto');
        item.innerHTML = `<h3>${crypto.toUpperCase()}</h3><p>Amount: ${amount}</p><p>Value: ${value.toFixed(2)} USD</p>`;
        portfolioContent.appendChild(item);
    }

    const totalValueItem = document.createElement('div');
    totalValueItem.classList.add('crypto');
    totalValueItem.innerHTML = `<h3>Total Portfolio Value</h3><p>${totalValue.toFixed(2)} USD</p>`;
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

async function loadTradeHistory() {
    const user = auth.currentUser;
    if (user) {
        const tradeHistoryRef = db.collection("tradeHistory").doc(user.uid);
        const tradeHistoryDoc = await tradeHistoryRef.get();

        if (tradeHistoryDoc.exists()) {
            const tradeHistoryData = tradeHistoryDoc.data();
            displayTradeHistory(tradeHistoryData);
        } else {
            console.log("No trade history found.");
            document.getElementById('tradeHistory').innerText = "No trade history found.";
        }
    } else {
        console.log("No user logged in.");
    }
}

function displayTradeHistory(tradeHistoryData) {
    const tradeHistoryContent = document.getElementById('tradeHistory');
    tradeHistoryContent.innerHTML = '';

    for (const [timestamp, trade] of Object.entries(tradeHistoryData)) {
        const item = document.createElement('div');
        item.classList.add('trade');
        item.innerHTML = `<p>${timestamp}: ${trade}</p>`;
        tradeHistoryContent.appendChild(item);
    }
}

// Event listener for trade form submission
document.getElementById('tradeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (user) {
        const crypto = document.getElementById('crypto').value.toLowerCase();
        const amount = parseFloat(document.getElementById('amount').value);

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
        await saveTradeHistory(crypto, amount);
        loadPortfolio();
    }
});

async function saveTradeHistory(crypto, amount) {
    const user = auth.currentUser;
    if (user) {
        const tradeHistoryRef = db.collection("tradeHistory").doc(user.uid);
        const timestamp = new Date().toISOString();
        await tradeHistoryRef.set({
            [timestamp]: `Traded ${amount} of ${crypto}`
        }, { merge: true });
    }
}

// Function to update the portfolio chart
async function updatePortfolioChart() {
    const user = auth.currentUser;
    if (user) {
        const historyRef = db.collection("portfolioHistory").doc(user.uid);
        const historyDoc = await historyRef.get();

        if (historyDoc.exists()) {
            const historyData = historyDoc.data();
            const labels = Object.keys(historyData);
            const data = Object.values(historyData);

            const ctx = document.getElementById('portfolioChart').getContext('2d');
            new Chart(ctx, {
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
                                unit: 'day'
                            }
                        }
                    }
                }
            });
        }
    }
}
