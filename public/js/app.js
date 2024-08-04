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
}

// Fetch data from CoinGecko API
async function fetchCryptoPrice(crypto) {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd&x_cg_demo_api_key=CG-GWH6d4aEUY66FHYcP3WMP8c1`);
    const data = await response.json();
    return data[crypto].usd;
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

    for (const [crypto, amount] of Object.entries(portfolioData)) {
        const item = document.createElement('div');
        item.innerText = `${crypto}: ${amount} (${(amount * prices[crypto]).toFixed(2)} USD)`;
        portfolioContent.appendChild(item);
    }
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
    const tradeHistory = document.getElementById('trade_history');
    const tradeItem = document.createElement('div');
    tradeItem.innerText = `Traded ${amount} of ${crypto}`;
    tradeHistory.appendChild(tradeItem);
}

// Refresh portfolio prices every hour
setInterval(loadPortfolio, 3600000);

onAuthStateChanged(auth, (user) => {
    if (user) {
        showAuthenticatedUI();
        loadPortfolio();
    } else {
        document.getElementById('login_div').style.display = 'block';
        document.getElementById('app').style.display = 'none';
    }
});