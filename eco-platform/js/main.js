// Firebase Imports (ensure you have the correct version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    addDoc,
    serverTimestamp,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =======================================
//         CONFIGURATION
// =======================================

// IMPORTANT: Replace this with your own Firebase project configuration!
const firebaseConfig = {
  apiKey: "AIzaSyDfrcDuuoqDw8I9CJ03cUHoRMgzIFzdFpk",
  authDomain: "eco-platform-b48da.firebaseapp.com",
  projectId: "eco-platform-b48da",
  storageBucket: "eco-platform-b48da.appspot.com",
  messagingSenderId: "358478903597",
  appId: "1:358478903597:web:c27175fd3b578ffe90fba4",
  measurementId: "G-LMLC1PP4TD"
};


// IMPORTANT: Your Gemini API Key
const GEMINI_API_KEY = "AIzaSyCR7UNebl6juC-ab-myM9C7tWceLnideYI";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

// =======================================
//         INITIALIZATION
// =======================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =======================================
//         DOM ELEMENT SELECTORS
// =======================================

const loggedOutView = document.getElementById('logged-out-view');
const loggedInView = document.getElementById('logged-in-view');
const loadingSpinner = document.getElementById('loading-spinner');

const appViews = document.querySelectorAll('.app-view');
const authModal = document.getElementById('auth-modal');
const closeAuthModalBtn = document.getElementById('close-auth-modal');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

const showLoginBtn = document.getElementById('show-login-btn');
const showSignupBtn = document.getElementById('show-signup-btn');
const heroSignupBtn = document.getElementById('hero-signup-btn');
const switchToSignupBtn = document.getElementById('switch-to-signup');
const switchToLoginBtn = document.getElementById('switch-to-login');
const logoutBtn = document.getElementById('logout-btn');

const greenCoinBalanceEl = document.getElementById('green-coin-balance');

const quizTopicList = document.getElementById('quiz-topic-list');
const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const progressBar = document.getElementById('progress-bar');
const finalScoreEl = document.getElementById('final-score');
const totalScoreEl = document.getElementById('total-score');
const coinsEarnedEl = document.getElementById('coins-earned');
const backToTopicsBtn = document.getElementById('back-to-topics-btn');

const rewardsList = document.getElementById('rewards-list');
const challengesList = document.getElementById('challenges-list');
const leaderboardList = document.getElementById('leaderboard-list');
const myRewardsList = document.getElementById('my-rewards-list'); // New

// =======================================
//         APPLICATION STATE
// =======================================

let currentUser = null;
let userData = null;
let currentQuiz = [];
let currentQuestionIndex = 0;
let score = 0;

// =======================================
//         STATIC DATA
// =======================================

const quizTopics = [
    { name: "Renewable Energy", subtitle: "Clean Power" },
    { name: "Waste Management", subtitle: "Reduce & Reuse" },
    { name: "Water Conservation", subtitle: "Every Drop Counts" },
    { name: "Sustainable Agriculture", subtitle: "Future of Food" },
    { name: "Climate Change", subtitle: "Global Challenge" },
    { name: "Biodiversity", subtitle: "Life on Earth" },
];

const rewardsData = [
    { title: "Cafeteria Discount", description: "Get 15% off your next meal.", cost: 150 },
    { title: "Free Shuttle Ride", description: "One free ride on the campus shuttle.", cost: 200 },
    { title: "Stationery Voucher", description: "A voucher for the campus store.", cost: 300 },
    { title: "Eco-Water Bottle", description: "Claim a reusable water bottle.", cost: 1000 },
    { title: "Plant a Tree", description: "We'll plant a tree in your name.", cost: 1500 },
];

const challengesData = [
    { title: "Plant a Sapling", description: "Plant a sapling and upload a photo.", reward: 200 },
    { title: "Campus Cleanup", description: "Organize a cleanup. Submit before/after photos.", reward: 500 },
    { title: "DIY Composting", description: "Start your own compost bin for organic waste.", reward: 300 },
    { title: "Plastic-Free Week", description: "Go a full week without single-use plastics.", reward: 250 },
];

// =======================================
//         HELPER FUNCTIONS
// =======================================

const showLoading = (show) => {
    loadingSpinner.classList.toggle('hidden', !show);
};

const showView = (viewId) => {
    appViews.forEach(view => view.classList.add('hidden'));
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.classList.remove('hidden');
    }
};

const generateCouponCode = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'ECO-';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// =======================================
//         AUTHENTICATION LOGIC
// =======================================

const openAuthModal = (isLogin = true) => {
    authModal.classList.remove('hidden');
    loginForm.classList.toggle('hidden', !isLogin);
    signupForm.classList.toggle('hidden', isLogin);
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('signup-error').classList.add('hidden');
};

const closeAuthModal = () => {
    authModal.classList.add('hidden');
    loginForm.reset();
    signupForm.reset();
};

const setupAuthListeners = () => {
    showLoginBtn.addEventListener('click', () => openAuthModal(true));
    showSignupBtn.addEventListener('click', () => openAuthModal(false));
    heroSignupBtn.addEventListener('click', () => openAuthModal(false));
    closeAuthModalBtn.addEventListener('click', closeAuthModal);
    switchToSignupBtn.addEventListener('click', () => openAuthModal(false));
    switchToLoginBtn.addEventListener('click', () => openAuthModal(true));

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;
        const errorEl = document.getElementById('login-error');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            closeAuthModal();
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        } finally {
            showLoading(false);
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading(true);
        const name = signupForm['signup-name'].value;
        const email = signupForm['signup-email'].value;
        const password = signupForm['signup-password'].value;
        const errorEl = document.getElementById('signup-error');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            await createUserDocument(userCredential.user, name);
            closeAuthModal();
        } catch (error) {
            errorEl.textContent = error.message;
            errorEl.classList.remove('hidden');
        } finally {
            showLoading(false);
        }
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
};

// =======================================
//         FIRESTORE DATABASE LOGIC
// =======================================

const createUserDocument = async (user, name) => {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
        uid: user.uid,
        name: name,
        email: user.email,
        greenCoins: 0,
        createdAt: new Date()
    });
};

const getUserData = async (uid) => {
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);
    return docSnap.exists() ? docSnap.data() : null;
};

const updateUserCoins = async (uid, newCoinTotal) => {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { greenCoins: newCoinTotal }, { merge: true });
};

const saveRedeemedReward = async (rewardTitle, cost, code) => {
    try {
        await addDoc(collection(db, "redeemedRewards"), {
            userId: currentUser.uid,
            userName: userData.name,
            rewardTitle: rewardTitle,
            cost: cost,
            code: code,
            redeemedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error saving redeemed reward: ", error);
    }
};

// =======================================
//         UI RENDERING LOGIC
// =======================================

const updateUIForAuthState = async (user) => {
    showLoading(true);
    if (user) {
        currentUser = user;
        userData = await getUserData(user.uid);
        if (userData) {
            greenCoinBalanceEl.textContent = `${userData.greenCoins} GC`;
        }
        loggedInView.classList.remove('hidden');
        loggedOutView.classList.add('hidden');
        showView('dashboard-view');
    } else {
        currentUser = null;
        userData = null;
        loggedInView.classList.add('hidden');
        loggedOutView.classList.remove('hidden');
    }
    showLoading(false);
};

const renderQuizTopics = () => {
    quizTopicList.innerHTML = '';
    quizTopics.forEach(topic => {
        const card = document.createElement('div');
        card.className = 'flex flex-col justify-center items-center text-center p-4 bg-[#2d2d2d] border border-[#444] rounded-sm transition-all duration-200 ease-in-out cursor-pointer hover:border-emerald-500 aspect-square';
        card.dataset.topic = topic.name;
        card.innerHTML = `
            <div class="text-emerald-500 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm2 0a1 1 0 00-1 1v1h1V4z" clip-rule="evenodd" /></svg>
            </div>
            <div>
                <h3 class="text-lg font-bold text-white">${topic.name}</h3>
                <span class="text-xs text-gray-400">${topic.subtitle}</span>
            </div>
        `;
        card.addEventListener('click', () => startQuiz(topic.name));
        quizTopicList.appendChild(card);
    });
};

const renderQuestion = () => {
    const question = currentQuiz[currentQuestionIndex];
    questionText.textContent = question.question;
    optionsContainer.innerHTML = '';
    optionsContainer.classList.remove('options-disabled');
    question.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'block w-full text-left p-4 bg-[#2d2d2d] border border-[#444] rounded-sm transition-all duration-200 ease-in-out cursor-pointer hover:border-emerald-500';
        button.textContent = option;
        button.dataset.correct = (option === question.answer);
        button.addEventListener('click', handleOptionClick);
        optionsContainer.appendChild(button);
    });
    const progress = ((currentQuestionIndex) / currentQuiz.length) * 100;
    progressBar.style.width = `${progress}%`;
};

const renderRewards = () => {
    rewardsList.innerHTML = '';
    rewardsData.forEach(reward => {
        const card = document.createElement('div');
        card.className = 'flex items-center gap-5 p-6 bg-[#2d2d2d] border border-[#444] rounded-sm transition-all duration-200 ease-in-out hover:border-emerald-500';
        card.innerHTML = `
            <div class="flex-shrink-0 text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5a.997.997 0 01.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" /></svg>
            </div>
            <div class="flex-grow">
                <h3 class="text-2xl font-bold text-white">${reward.title}</h3>
                <p class="mt-2 text-gray-400 text-sm">${reward.description}</p>
            </div>
            <div class="flex-shrink-0">
                 <button class="bg-emerald-600 text-white font-bold py-2 px-4 rounded-sm transition-all duration-200 ease-in-out hover:bg-emerald-500 redeem-btn" data-cost="${reward.cost}" data-title="${reward.title}">
                    Redeem for ${reward.cost} GC
                </button>
            </div>
        `;
        rewardsList.appendChild(card);
    });
};

const renderChallenges = () => {
    challengesList.innerHTML = '';
    challengesData.forEach(challenge => {
        const card = document.createElement('div');
        card.className = 'flex items-center gap-5 p-6 bg-[#2d2d2d] border border-[#444] rounded-sm transition-all duration-200 ease-in-out hover:border-emerald-500';
        card.innerHTML = `
            <div class="flex-shrink-0 text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" /></svg>
            </div>
            <div class="flex-grow">
                <h3 class="text-2xl font-bold text-white">${challenge.title}</h3>
                <p class="mt-2 text-gray-400 text-sm">${challenge.description}</p>
            </div>
            <div class="flex-shrink-0 text-center">
                <span class="block font-bold text-lg text-yellow-400">+${challenge.reward} GC</span>
                <button class="mt-1 text-sm bg-gray-700 text-white font-bold py-2 px-4 rounded-sm transition-all duration-200 ease-in-out hover:bg-gray-600 submit-challenge-btn">Submit</button>
            </div>
        `;
        challengesList.appendChild(card);
    });
};

const fetchAndRenderLeaderboard = async () => {
    showLoading(true);
    leaderboardList.innerHTML = '<p class="text-gray-400">Loading rankings...</p>';
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("greenCoins", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            leaderboardList.innerHTML = '<p class="text-gray-400">No users found.</p>';
            return;
        }
        let rank = 1;
        let leaderboardHTML = '';
        querySnapshot.forEach(doc => {
            const user = doc.data();
            const isCurrentUser = currentUser && user.uid === currentUser.uid;
            const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-yellow-600' : 'text-gray-500';
            leaderboardHTML += `
                <div class="flex items-center p-4 rounded-md ${isCurrentUser ? 'bg-emerald-900 border border-emerald-500' : 'bg-[#2d2d2d]'}">
                    <div class="w-12 text-center text-2xl font-bold ${rankColor}">#${rank}</div>
                    <div class="flex-grow mx-4">
                        <p class="font-bold text-lg ${isCurrentUser ? 'text-white' : 'text-gray-200'}">${user.name}</p>
                    </div>
                    <div class="text-xl font-bold text-yellow-400">${user.greenCoins} GC</div>
                </div>
            `;
            rank++;
        });
        leaderboardList.innerHTML = leaderboardHTML;
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        leaderboardList.innerHTML = '<p class="text-red-500">Could not load leaderboard.</p>';
    } finally {
        showLoading(false);
    }
};

const fetchAndRenderMyRewards = async () => {
    if (!currentUser) return;
    showLoading(true);
    myRewardsList.innerHTML = '<p class="text-gray-400">Loading your rewards...</p>';
    try {
        const rewardsRef = collection(db, "redeemedRewards");
        const q = query(rewardsRef, where("userId", "==", currentUser.uid), orderBy("redeemedAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            myRewardsList.innerHTML = '<p class="text-gray-400">You haven\'t redeemed any rewards yet.</p>';
            return;
        }

        let rewardsHTML = '';
        querySnapshot.forEach(doc => {
            const reward = doc.data();
            const redeemedDate = reward.redeemedAt ? reward.redeemedAt.toDate().toLocaleDateString() : 'Just now';
            rewardsHTML += `
                <div class="bg-[#2d2d2d] p-4 rounded-md border border-[#444] flex items-center justify-between gap-4">
                    <div>
                        <p class="font-bold text-white">${reward.rewardTitle}</p>
                        <p class="text-sm text-gray-400">Redeemed on ${redeemedDate}</p>
                    </div>
                    <div class="bg-gray-800 text-yellow-400 font-mono p-2 rounded-md">
                        ${reward.code}
                    </div>
                </div>
            `;
        });
        myRewardsList.innerHTML = rewardsHTML;
    } catch (error) {
        console.error("Error fetching my rewards:", error);
        myRewardsList.innerHTML = '<p class="text-red-500">Could not load your rewards.</p>';
    } finally {
        showLoading(false);
    }
};

const fetchQuizQuestions = async (topic) => {
    const randomNumber = Math.floor(Math.random() * 10000);
    const prompt = `Create a unique set of 5 multiple-choice quiz questions about ${topic}. Use the number ${randomNumber} as a random seed to ensure the questions are different from previous requests. Provide the response as a JSON array. Each object in the array should have three keys: "question" (string), "options" (an array of 4 strings), and "answer" (a string that exactly matches one of the options). Do not include any text or markdown formatting outside of the JSON array.`;
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        });
        if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;
        const cleanedJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJson);
    } catch (error) {
        console.error("Failed to fetch or parse quiz questions:", error);
        alert("Sorry, we couldn't create a quiz. Please try another topic.");
        return null;
    }
};

const startQuiz = async (topic) => {
    showLoading(true);
    const questions = await fetchQuizQuestions(topic);
    showLoading(false);
    if (questions && questions.length > 0) {
        currentQuiz = questions;
        currentQuestionIndex = 0;
        score = 0;
        showView('quiz-active-view');
        renderQuestion();
    }
};

const handleOptionClick = (event) => {
    const selectedOption = event.currentTarget;
    const isCorrect = selectedOption.dataset.correct === 'true';
    optionsContainer.classList.add('options-disabled');
    optionsContainer.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('hover:border-emerald-500');
    });
    if (isCorrect) {
        selectedOption.className = selectedOption.className.replace('border-[#444]', 'border-emerald-500 bg-emerald-900');
        score++;
    } else {
        selectedOption.className = selectedOption.className.replace('border-[#444]', 'border-red-500 bg-red-900');
        const correctOptionButton = optionsContainer.querySelector("button[data-correct='true']");
        if (correctOptionButton) {
            correctOptionButton.className = correctOptionButton.className.replace('border-[#444]', 'border-emerald-500 bg-emerald-900');
        }
    }
    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuiz.length) {
            renderQuestion();
        } else {
            endQuiz();
        }
    }, 1500);
};

const endQuiz = async () => {
    const coins = score * 10;
    const newTotal = userData.greenCoins + coins;
    showLoading(true);
    await updateUserCoins(currentUser.uid, newTotal);
    userData.greenCoins = newTotal;
    showLoading(false);
    greenCoinBalanceEl.textContent = `${newTotal} GC`;
    finalScoreEl.textContent = score;
    totalScoreEl.textContent = currentQuiz.length;
    coinsEarnedEl.textContent = coins;
    showView('quiz-results-view');
};

const setupAppEventListeners = () => {
    document.body.addEventListener('click', (e) => {
        const viewButton = e.target.closest('[data-view]');
        if (viewButton && loggedInView.contains(viewButton)) {
            const viewId = viewButton.dataset.view;
            if (viewId === 'leaderboard-view') {
                fetchAndRenderLeaderboard();
            }
            if (viewId === 'my-rewards-view') {
                fetchAndRenderMyRewards();
            }
            showView(viewId);
        }
    });
    backToTopicsBtn.addEventListener('click', () => showView('quiz-topics-view'));
    rewardsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('redeem-btn')) {
            const button = e.target;
            const cost = parseInt(button.dataset.cost);
            const title = button.dataset.title;
            if (userData.greenCoins >= cost) {
                if (confirm(`Redeem "${title}" for ${cost} coins?`)) {
                    showLoading(true);
                    const couponCode = generateCouponCode();
                    await saveRedeemedReward(title, cost, couponCode);
                    const newTotal = userData.greenCoins - cost;
                    await updateUserCoins(currentUser.uid, newTotal);
                    userData.greenCoins = newTotal;
                    greenCoinBalanceEl.textContent = `${newTotal} GC`;
                    showLoading(false);
                    alert(`Reward claimed!\n\nYour code for "${title}" is: ${couponCode}\n\nYou can view your codes on the "My Rewards" page.`);
                }
            } else {
                alert("You don't have enough coins!");
            }
        }
    });
    challengesList.addEventListener('click', (e) => {
        if (e.target.classList.contains('submit-challenge-btn')) {
            alert("This feature is coming soon!");
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    setupAppEventListeners();
    onAuthStateChanged(auth, updateUIForAuthState);
    renderQuizTopics();
    renderRewards();
    renderChallenges();
});