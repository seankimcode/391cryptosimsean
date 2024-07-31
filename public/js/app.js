import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.8/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.6.8/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.8/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

window.createAccount = function() {
    const email = document.getElementById('email_field').value;
    const password = document.getElementById('password_field').value;

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            alert('Account created successfully!');
            showAuthenticatedUI();
        })
        .catch((error) => {
            alert('Error creating account: ' + error.message);
        });
};

window.login = function() {
    const email = document.getElementById('email_field').value;
    const password = document.getElementById('password_field').value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            alert('Logged in successfully!');
            showAuthenticatedUI();
        })
        .catch((error) => {
            alert('Error logging in: ' + error.message);
        });
};

window.logout = function() {
    signOut(auth).then(() => {
        alert('Logged out successfully!');
        document.getElementById('login_div').style.display = 'block';
        document.getElementById('app').style.display = 'none';
    }).catch((error) => {
        alert('Error logging out: ' + error.message);
    });
};

function showAuthenticatedUI() {
    document.getElementById('login_div').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    showPage('portfolio_div');
}

// Fetch data from CoinGecko API
window.fetchCryptoData = async function() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
        const data = await response.json();
        console.log('Bitcoin Price: USD', data.bitcoin.usd);
    } catch (error) {
        console.error('Error fetching data from CoinGecko:', error);
    }
};

// Show the specified page and hide others
window.showPage = function(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
};

// Add portfolio management functions
async function loadPortfolio() {
    const user = auth.currentUser;
    if (user) {
        const portfolioRef = doc(db, "portfolios", user.uid);
        const portfolioDoc = await getDoc(portfolioRef);

        if (portfolioDoc.exists()) {
            const portfolioData = portfolioDoc.data();
            displayPortfolio(portfolioData);
        } else {
            console.log("No portfolio found.");
            document.getElementById('portfolio_content').innerText = "No portfolio found.";
        }
    } else {
        console.log("No user logged in.");
    }
}

function displayPortfolio(portfolioData) {
    const portfolioContent = document.getElementById('portfolio_content');
    portfolioContent.innerHTML = '';

    for (const [crypto, amount] of Object.entries(portfolioData)) {
        const item = document.createElement('div');
        item.innerText = `${crypto}: ${amount}`;
        portfolioContent.appendChild(item);
    }
}

async function updatePortfolio(crypto, amount) {
    const user = auth.currentUser;
    if (user) {
        const portfolioRef = doc(db, "portfolios", user.uid);
        await setDoc(portfolioRef, { [crypto]: amount }, { merge: true });
        loadPortfolio();
        addTradeToHistory(crypto, amount);
    } else {
        console.log("No user logged in.");
    }
}

async function performTrade(event) {
    event.preventDefault();
    const crypto = document.getElementById('crypto').value;
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
