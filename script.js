// script.js - Handles client‑side Firebase authentication & dashboard logic

// Firebase configuration (replace with your own values if needed)
const firebaseConfig = {
  apiKey: "AIzaSyBanv10gOHkTBlylH5d1MwDm5YskRzkFZk",
  authDomain: "akash-14574.firebaseapp.com",
  projectId: "akash-14574",
  storageBucket: "akash-14574.firebasestorage.app",
  messagingSenderId: "1058558884003",
  appId: "1:1058558884003:web:247a151eb2f2ea205f2716",
  // measurementId is optional
};

// Initialize Firebase (using the compat SDK loaded via script tags)
firebase.initializeApp(firebaseConfig);

// Firestore reference (optional for user profile storage)
const db = firebase.firestore();

// Dynamically load tsParticles — Minimal Gemini/OpenAI Floating Dots
(function initParticlesBackground() {
  function startParticles() {
    if (!document.getElementById("particles-js")) {
      const container = document.createElement("div");
      container.id = "particles-js";
      container.style.position = "fixed";
      container.style.inset = "0";
      container.style.zIndex = "-1";
      container.style.pointerEvents = "none";
      document.body.prepend(container);
    }

    if (window.tsParticles) {
      tsParticles.load("particles-js", {
        background: {
          color: "#050816"
        },
        particles: {
          number: {
            value: 90,
            density: {
              enable: true,
              value_area: 800
            }
          },
          color: {
            value: "#ffffff"
          },
          opacity: {
            value: 0.5,
            random: true
          },
          size: {
            value: 2.5,
            random: true
          },
          move: {
            enable: true,
            speed: 0.4,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out"
          },
          links: {
            enable: false
          }
        },
        interactivity: {
          events: {
            onhover: {
              enable: true,
              mode: "repulse"
            }
          },
          modes: {
            repulse: {
              distance: 80,
              duration: 0.4
            }
          }
        }
      });
    }
  }

  function loadScript(src, callback) {
    if (window.tsParticles) {
      callback();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = callback;
    document.head.appendChild(s);
  }

  function init() {
    loadScript("https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js", startParticles);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


// Firebase Auth helpers (no local storage needed)
function firebaseLogin(email, password) {
  return firebase.auth().signInWithEmailAndPassword(email, password);
}

function firebaseRegister(email, password) {
  return firebase.auth().createUserWithEmailAndPassword(email, password);
}

function firebaseSignOut() {
  return firebase.auth().signOut();
}

// Social Auth Providers
const googleProvider = new firebase.auth.GoogleAuthProvider();
const githubProvider = new firebase.auth.GithubAuthProvider();
const microsoftProvider = new firebase.auth.OAuthProvider('microsoft.com');

function firebaseSocialLogin(provider) {
  return firebase.auth().signInWithPopup(provider).then((result) => {
    const user = result.user;
    // Try to store profile info, but don't fail the login if Firestore rules block it
    return db.collection('users').doc(user.uid).set({
      fullName: user.displayName || user.email.split('@')[0] || 'User',
      email: user.email,
      username: user.email ? user.email.split('@')[0] : 'user'
    }, { merge: true })
    .catch((err) => {
      console.warn("Firestore profile save skipped (likely rules missing):", err.message);
      // Resolve anyway so the login redirect can proceed
      return Promise.resolve();
    });
  });
}

function fetchUserProfile(uid) {
  return db.collection('users').doc(uid).get();
}

// -------- Password visibility toggles --------
function initPasswordToggles() {
  document.querySelectorAll(".toggle-pwd").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target || "password";
      const pwdInput = document.getElementById(targetId);
      if (!pwdInput) return;
      const isPassword = pwdInput.type === "password";
      pwdInput.type = isPassword ? "text" : "password";
      btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    });
  });
}

// -------- Login flow --------
function initLoginForm() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = loginForm.identifier.value.trim();
      const password = loginForm.password.value;
      firebaseLogin(email, password)
        .then(() => {
          window.location.href = "dashboard.html";
        })
        .catch((error) => {
          alert(error.message || "Login failed.");
        });
    });
  }

  // Social Login Buttons (Login Page)
  const handleSocial = (provider) => {
    firebaseSocialLogin(provider)
      .then(() => { window.location.href = "dashboard.html"; })
      .catch((err) => { alert(err.message || "Social login failed."); });
  };

  const googleBtn = document.getElementById("googleLoginBtn");
  const githubBtn = document.getElementById("githubLoginBtn");
  const msBtn = document.getElementById("microsoftLoginBtn");

  if (googleBtn) googleBtn.addEventListener("click", () => handleSocial(googleProvider));
  if (githubBtn) githubBtn.addEventListener("click", () => handleSocial(githubProvider));
  if (msBtn) msBtn.addEventListener("click", () => handleSocial(microsoftProvider));
}

// -------- Registration flow --------
function initRegisterForm() {
  const regForm = document.getElementById("registerForm");
  if (regForm) {
    regForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fullName = regForm.fullName.value.trim();
      const email = regForm.email.value.trim();
      const username = regForm.username.value.trim();
      const password = regForm.regPassword.value;
      const confirmPassword = regForm.confirmPassword.value;
      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }
      firebaseRegister(email, password)
        .then((cred) => {
          const uid = cred.user.uid;
          // Store extra profile data in Firestore
          return db.collection('users').doc(uid).set({
            fullName,
            username,
            email
          });
        })
        .then(() => {
          window.location.href = "dashboard.html";
        })
        .catch((error) => {
          alert(error.message || "Registration failed.");
        });
    });
  }

  // Social Login Buttons (Register Page)
  const handleSocial = (provider) => {
    firebaseSocialLogin(provider)
      .then(() => { window.location.href = "dashboard.html"; })
      .catch((err) => { alert(err.message || "Social sign up failed."); });
  };

  const googleBtnReg = document.getElementById("googleRegBtn");
  const githubBtnReg = document.getElementById("githubRegBtn");
  const msBtnReg = document.getElementById("microsoftRegBtn");

  if (googleBtnReg) googleBtnReg.addEventListener("click", () => handleSocial(googleProvider));
  if (githubBtnReg) githubBtnReg.addEventListener("click", () => handleSocial(githubProvider));
  if (msBtnReg) msBtnReg.addEventListener("click", () => handleSocial(microsoftProvider));
}

// -------- Dashboard & Sidebar logic --------
function renderSidebar() {
  const sidebarEl = document.getElementById("sidebar");
  if (!sidebarEl) return;

  const mainContent = document.querySelector(".main-content");
  const currentPage = mainContent ? mainContent.getAttribute("data-page") : "dashboard";

  const navItems = [
    { id: "dashboard", href: "dashboard.html", icon: "🏠", label: "Dashboard" },
    { 
      id: "news", icon: "📰", label: "AI News", isDropdown: true,
      children: [
        { id: "news_main", href: "news.html", icon: "📰", label: "AI News" },
        { id: "saved_news", href: "saved_news.html", icon: "⭐", label: "Saved News" }
      ]
    },
// Updated Detect & Analytics dropdown
    { 
      id: "detect", icon: "🖼️", label: "Detect", isDropdown: true,
      children: [
        { id: "detect", href: "detect.html", icon: "🖼️", label: "Detect Image" },
        { id: "analytics", href: "analytics.html", icon: "📊", label: "Analytics" }
      ]
    },
    { id: "profile", href: "profile.html", icon: "👤", label: "Profile" },
    { id: "about", href: "about.html", icon: "ℹ️", label: "About" },
    { id: "contact", href: "contact.html", icon: "📞", label: "Contact" }
  ];

  const isNewsActive = currentPage === "news" || currentPage === "saved_news";

  let navHtml = navItems.map(item => {
    if (item.isDropdown) {
      const childrenHtml = item.children.map(child => `
        <a href="${child.href}" class="nav-dropdown-item ${currentPage === child.id ? 'active' : ''}">
          <span>${child.icon}</span> ${child.label}
        </a>
      `).join('');
      return `
        <div class="nav-dropdown-wrapper" id="dropdown-${item.id}">
          <button class="nav-item nav-dropdown-trigger ${isNewsActive ? 'active' : ''}" data-dropdown="${item.id}">
            <span class="nav-icon">${item.icon}</span>
            <span class="nav-text">${item.label}</span>
            <span class="nav-dropdown-arrow">▾</span>
          </button>
          <div class="nav-dropdown-menu" id="menu-${item.id}" style="display:none;">
            ${childrenHtml}
          </div>
        </div>
      `;
    }
    return `
      <a href="${item.href}" class="nav-item ${currentPage === item.id ? 'active' : ''}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-text">${item.label}</span>
      </a>
    `;
  }).join('');

  sidebarEl.innerHTML = `
    <aside style="width:100%; display:flex; align-items:center; padding:0 32px; gap:0; height:62px;">
      <div class="sidebar-brand">
        <img src="logo.png" alt="Logo" class="sidebar-brand-img" style="height:38px; width:auto; object-fit:contain;" />
        <span class="sidebar-brand-text" style="font-weight:900; font-family:'Outfit',sans-serif; background:-webkit-linear-gradient(45deg,#3b82f6,#a855f7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-size:1.15rem; letter-spacing:0.5px;">ImagScanner</span>
      </div>
      
      <nav class="sidebar-nav">
        ${navHtml}
        <div class="sidebar-divider"></div>
        <button class="nav-item logout-item" id="logoutBtn">
          <span class="nav-icon">🚪</span>
          <span class="nav-text">Logout</span>
        </button>
      </nav>

      <div class="sidebar-user">
        <div class="sidebar-user-avatar" id="sidebarAvatar">👤</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name" id="sidebarName">Loading...</div>
          <div class="sidebar-user-handle" id="sidebarHandle"></div>
        </div>
      </div>
    </aside>
  `;

  // Attach logout listener
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      firebaseSignOut()
        .then(() => { window.location.href = "index.html"; })
        .catch((error) => { alert(error.message || "Logout failed."); });
    });
  }

// Determine which dropdown should be open based on the current page
  const dropdownActiveMap = {
    news: ["news", "saved_news"],
    detect: ["detect", "analytics"]
  };
  let activeDropdownId = null;
  for (const [id, pages] of Object.entries(dropdownActiveMap)) {
    if (pages.includes(currentPage)) { activeDropdownId = id; break; }
  }

  // Dropdown toggle logic – generic for all dropdowns
  document.querySelectorAll('.nav-dropdown-trigger').forEach(trigger => {
    const dropdownId = trigger.getAttribute('data-dropdown');
    const menu = document.getElementById('menu-' + dropdownId);
    // Auto-open if this dropdown matches active page
    if (activeDropdownId === dropdownId) {
      menu.style.display = 'block';
    }
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = menu.style.display === 'block';
      // Close all dropdowns
      document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.style.display = 'none');
      // Toggle this one
      menu.style.display = isVisible ? 'none' : 'block';
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.style.display = 'none');
  });
}

// Helper — populate sidebar user card from any page
function updateSidebarUser(name, username, avatarUrl) {
  const nameEl = document.getElementById("sidebarName");
  const handleEl = document.getElementById("sidebarHandle");
  const avatarEl = document.getElementById("sidebarAvatar");
  if (nameEl) nameEl.textContent = name || 'User';
  if (handleEl) handleEl.textContent = username ? `@${username}` : '';
  if (avatarEl) {
    if (avatarUrl) {
      avatarEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
    } else {
      avatarEl.textContent = (name || 'U').charAt(0).toUpperCase();
    }
  }
}

function initDashboard() {
  // Only run on dashboard pages
  if (!document.getElementById("sidebar")) return;

  renderSidebar();

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    // Fetch profile from Firestore for display name + username
    fetchUserProfile(user.uid)
      .then((doc) => {
        const data = doc.exists ? (doc.data() || {}) : {};
        // Robust fallback: Firestore fullName → Google displayName → email prefix → 'User'
        const rawName = data.fullName || user.displayName || '';
        const name = (rawName && rawName !== 'null') ? rawName : (user.email ? user.email.split('@')[0] : 'User');
        const username = data.username || '';
        const avatarUrl = data.avatarUrl || '';
        // Welcome message
        const welcomeEl = document.getElementById("welcomeMsg");
        if (welcomeEl) welcomeEl.textContent = `Welcome, ${name}!`;
        const usernameEl = document.getElementById("welcomeUsername");
        if (usernameEl) usernameEl.textContent = username ? `@${username}` : '';
        // Update sidebar
        updateSidebarUser(name, username, avatarUrl);
      })
      .catch(() => {
        const fallback = user.email ? user.email.split('@')[0] : 'User';
        const welcomeEl = document.getElementById("welcomeMsg");
        if (welcomeEl) welcomeEl.textContent = `Welcome, ${fallback}!`;
        updateSidebarUser(fallback, '');
      });

    // Fetch Stats & Recent Activity from Firestore (moved inside onAuthStateChanged)
    db.collection("detections").where("userId", "==", user.uid).get()
      .then(snapshot => {
        let total = 0, real = 0, ai = 0;
        
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort newest first
        docs.sort((a, b) => {
          const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
          const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
          return timeB - timeA;
        });

        docs.forEach(doc => {
          total++;
          if (doc.prediction === "Real") real++;
          else ai++;
        });

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setVal("totalImages", total);
        setVal("realImages", real);
        setVal("aiImages", ai);

        const activityList = document.getElementById("activityList");
        if (activityList) {
          if (docs.length > 0) {
            activityList.innerHTML = "";
            docs.slice(0, 5).forEach(item => {
              const li = document.createElement("li");
              const dateStr = item.timestamp ? new Date(item.timestamp.toMillis()).toLocaleString() : "Recently";
              li.textContent = `Analyzed image - Prediction: ${item.prediction} (${item.confidence}%) on ${dateStr}`;
              activityList.appendChild(li);
            });
          } else {
            activityList.innerHTML = "<li style='color:var(--text-secondary);'>No activity yet — upload an image to get started!</li>";
          }
        }
      })
      .catch(err => console.error("Error fetching dashboard stats:", err));
  });

  // Quick detection buttons (on dashboard)
  const handleDetect = () => { window.location.href = "detect.html"; };
  const detectBtn = document.getElementById("detectBtn");
  if (detectBtn) detectBtn.addEventListener("click", handleDetect);
}

// Toast notification helper
function showToast(message, type = 'success') {
  // Remove any existing toast first
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Clean up element after animation finishes
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2700);
}

// -------- Detect Page Logic --------
function initDetectPage() {
  const detectPage = document.querySelector('[data-page="detect"]');
  if (!detectPage) return;

  const imageInput = document.getElementById("imageInput");
  const chooseImgBtn = document.getElementById("chooseImgBtn");
  const removeImgBtn = document.getElementById("removeImgBtn");
  const analyzeBtn = document.getElementById("analyzeBtn");
  const resetBtn = document.getElementById("resetBtn");
  const dropZone = document.getElementById("dropZone");
  
  const previewImg = document.getElementById("previewImg");
  const previewPlaceholder = document.getElementById("previewPlaceholder");
  
  const imageInfoSection = document.getElementById("imageInfoSection");
  const imgInfoName = document.getElementById("imgInfoName");
  const imgInfoRes = document.getElementById("imgInfoRes");
  const imgInfoSize = document.getElementById("imgInfoSize");
  const imgInfoFormat = document.getElementById("imgInfoFormat");
  const imgInfoTime = document.getElementById("imgInfoTime");

  const resultsContainer = document.getElementById("resultsContainer");
  const resultOriginalImg = document.getElementById("resultOriginalImg");
  const resultHeatmapImg = document.getElementById("resultHeatmapImg");
  
  let currentFile = null;
  let currentBase64 = null;
  let currentDetectionID = null;

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Choose Image click triggers file input
  chooseImgBtn.addEventListener("click", () => {
    imageInput.click();
  });

  // Drag & Drop bindings
  // Drag & Drop bindings
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); });
  });
  ['dragenter', 'dragover'].forEach(evt => dropZone.addEventListener(evt, () => dropZone.classList.add("dragover")));
  ['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, () => dropZone.classList.remove("dragover")));

  // Click on drop zone to open file picker
  dropZone.addEventListener('click', () => { imageInput.click(); });

  dropZone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  imageInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast("Invalid file type. Only JPG, PNG, and WEBP are allowed.", "error");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("File is too large. Maximum size is 10MB.", "error");
      return;
    }

    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      currentBase64 = e.target.result;
      previewImg.src = currentBase64;
      previewImg.style.display = "block";
      previewPlaceholder.style.display = "none";
      
      // Calculate resolution by loading image into memory
      const img = new Image();
      img.onload = () => {
        const resolution = `${img.naturalWidth} × ${img.naturalHeight}`;
        imgInfoRes.textContent = resolution;
      };
      img.src = currentBase64;

      // Populate file info preview
      imgInfoName.textContent = file.name;
      imgInfoSize.textContent = formatBytes(file.size);
      imgInfoFormat.textContent = file.type.split('/')[1].toUpperCase();
      imgInfoTime.textContent = new Date().toLocaleTimeString();
      imageInfoSection.style.display = "block";

      // Reset results container
      resultsContainer.style.display = "none";
      resultOriginalImg.src = "";
      resultHeatmapImg.src = "";

      // Adjust button states
      // Hide the Choose Image button after an image is selected
      chooseImgBtn.style.display = "none";
      removeImgBtn.style.display = "inline-block";
      analyzeBtn.style.display = "inline-block";
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = "🤖 Analyze Image";
      resetBtn.style.display = "none";
    };
    reader.readAsDataURL(file);
  }

  // Remove button action
  removeImgBtn.addEventListener("click", () => {
    clearInputs();
  });

  // Reset button action
  resetBtn.addEventListener("click", () => {
    clearInputs();
  });

  function clearInputs() {
    currentFile = null;
    currentBase64 = null;
    currentDetectionID = null;
    imageInput.value = "";
    previewImg.src = "";
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "block";
    imageInfoSection.style.display = "none";
    resultsContainer.style.display = "none";
    
    // Reset control buttons
    // Restore Choose Image button visibility on clear
    chooseImgBtn.style.display = "inline-block";
    chooseImgBtn.textContent = "📂 Choose Image";
    removeImgBtn.style.display = "none";
    analyzeBtn.style.display = "none";
    resetBtn.style.display = "none";
    showToast("Image removed.", "info");
  }

  // Analyze Image
  analyzeBtn.addEventListener("click", () => {
    if (!currentFile || !currentBase64) return;
    
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Processing...";

    // Show full-screen loading overlay
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingVideo = document.getElementById("loadingVideo");
    if (loadingOverlay) {
      loadingOverlay.style.display = "flex";
      if (loadingVideo) { loadingVideo.currentTime = 0; loadingVideo.play(); }
    }
    
    const formData = new FormData();
    formData.append("image", currentFile);

    fetch("http://127.0.0.1:5000/predict", {
      method: "POST",
      body: formData
    })
    .then(response => {
      if (!response.ok) throw new Error("Server error");
      return response.json();
    })
    .then(data => {
      const isReal = data.prediction === "Real";
      const confidence = data.confidence;
      const processingTime = data.processing_time || 0.0;
      const predictionStr = data.prediction;
      
      // Hide loading overlay
      const loadingText = document.getElementById("loadingText");
      if (loadingText) loadingText.textContent = "Analysis Complete!";
      setTimeout(() => {
        if (loadingOverlay) loadingOverlay.style.display = "none";
        if (loadingVideo) loadingVideo.pause();
        if (loadingText) loadingText.textContent = "Analyzing Image...";
      }, 800);
      
      currentDetectionID = "DET-" + Math.floor(10000000 + Math.random() * 90000000);
      const detectionDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // 1. Update prediction result panel
      const predStatusBadge = document.getElementById("predStatusBadge");
      predStatusBadge.textContent = isReal ? "🟢 Real" : "🔴 AI Generated";
      predStatusBadge.className = `result-badge ${isReal ? 'real' : 'ai'}`;
      
      document.getElementById("predConf").textContent = `${confidence}%`;
      document.getElementById("predTime").textContent = `${processingTime} s`;
      document.getElementById("predDate").textContent = detectionDateStr;
      
      // 2. Update Explainable AI panel
      resultOriginalImg.src = currentBase64;
      resultOriginalImg.style.display = "block";
      resultHeatmapImg.src = data.heatmap_base64;
      resultHeatmapImg.style.display = "block";
      
      const explanation = isReal 
        ? "The EfficientNetB0 model detected natural texture gradients, consistent lighting, and realistic edge transitions typical of authentic photography." 
        : "The EfficientNetB0 model focused on synthetic noise patterns, overly smooth localized regions, and unnatural high-frequency artifacts often left by generative models.";
      
      document.getElementById("aiExplanation").textContent = explanation;

      // 3. Update Extra Details Grid
      // Image Information column
      document.getElementById("detailsImgName").textContent = currentFile.name;
      document.getElementById("detailsImgRes").textContent = imgInfoRes.textContent;
      document.getElementById("detailsImgSize").textContent = imgInfoSize.textContent;
      document.getElementById("detailsImgFormat").textContent = imgInfoFormat.textContent;
      document.getElementById("detailsImgTime").textContent = imgInfoTime.textContent;
      
      // Detection Details column
      document.getElementById("detailsPred").textContent = predictionStr;
      document.getElementById("detailsConf").textContent = `${confidence}%`;
      document.getElementById("detailsTime").textContent = `${processingTime} s`;
      document.getElementById("detailsModel").textContent = "EfficientNetB0 + Grad-CAM";
      document.getElementById("detailsID").textContent = currentDetectionID;
      document.getElementById("detailsDate").textContent = detectionDateStr;

      // 4. Update Report Preview
      document.getElementById("reportPreviewID").textContent = currentDetectionID;
      document.getElementById("reportPreviewImage").textContent = currentFile.name;
      document.getElementById("reportPreviewDate").textContent = detectionDateStr;
      document.getElementById("reportPreviewModel").textContent = "EfficientNetB0";
      document.getElementById("reportPreviewTime").textContent = `${processingTime} s`;
      
      const reportPred = document.getElementById("reportPreviewPrediction");
      reportPred.textContent = predictionStr === "Real" ? "Real Image" : "AI Generated";
      reportPred.style.color = isReal ? "#059669" : "#dc2626";
      
      document.getElementById("reportPreviewConfidence").textContent = `${confidence}%`;
      document.getElementById("reportPreviewOriginalImg").src = currentBase64;
      document.getElementById("reportPreviewHeatmapImg").src = data.heatmap_base64;
      document.getElementById("reportPreviewExplanation").textContent = explanation;

      // Fetch user's name to put in report preview
      const user = firebase.auth().currentUser;
      if (user) {
        db.collection("users").doc(user.uid).get().then(doc => {
          let name = "User";
          if (doc.exists && doc.data()?.fullName) {
            name = doc.data().fullName;
          } else if (user.displayName) {
            name = user.displayName;
          } else if (user.email) {
            name = user.email.split('@')[0];
          }
          document.getElementById("reportPreviewUser").textContent = name;
        }).catch(() => {
          document.getElementById("reportPreviewUser").textContent = user.displayName || user.email.split('@')[0] || "User";
        });
      }

      // Show results
      resultsContainer.style.display = "flex";
      analyzeBtn.textContent = "Analysis Complete";
      analyzeBtn.disabled = true;

      // Update button layout
      chooseImgBtn.style.display = "none";
      removeImgBtn.style.display = "none";
      analyzeBtn.style.display = "none";
      resetBtn.style.display = "inline-block";

      // Save to Firebase History
      saveDetectionToHistory(predictionStr, confidence, currentBase64);
      showToast("Analysis complete! Result auto-saved to history.", "success");
    })
    .catch(error => {
      if (loadingOverlay) loadingOverlay.style.display = "none";
      if (loadingVideo) loadingVideo.pause();
      console.error("Prediction failed:", error);
      showToast("Analysis failed. Is the Python backend running on port 5000?", "error");
      analyzeBtn.textContent = "🤖 Analyze Image";
      analyzeBtn.disabled = false;
    });
  });

  // Action listeners
  document.getElementById("analyzeAnotherBtn").addEventListener("click", () => {
    clearInputs();
  });

  // Download PDF Report
  document.getElementById("downloadPdfBtn").addEventListener("click", () => {
    const originalElement = document.getElementById("reportPreview");
    
    // Clone the element and place it off-screen to avoid overflow/hidden rendering issues with html2canvas
    const element = originalElement.cloneNode(true);
    element.style.position = "absolute";
    element.style.left = "-9999px";
    element.style.top = "0";
    element.style.width = "700px";
    document.body.appendChild(element);

    const opt = {
      margin:       0.3,
      filename:     `ai-detection-report-${currentDetectionID || 'result'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    showToast("Generating PDF Report...", "info");
    html2pdf().from(element).set(opt).save().then(() => {
      document.body.removeChild(element);
    });
  });

  // Download Original Image
  document.getElementById("downloadOrigBtn").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = currentBase64;
    a.download = `original-${currentFile.name}`;
    a.click();
    showToast("Original image downloaded.", "success");
  });

  // Download Heatmap Image
  document.getElementById("downloadHeatmapBtn").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = resultHeatmapImg.src;
    a.download = `heatmap-${currentFile.name}`;
    a.click();
    showToast("Grad-CAM Heatmap downloaded.", "success");
  });

  // Download Analysis JSON
  document.getElementById("downloadJsonBtn").addEventListener("click", () => {
    const analysisData = {
      image: {
        name: currentFile.name,
        size: currentFile.size,
        format: currentFile.type,
        resolution: imgInfoRes.textContent
      },
      detection: {
        id: currentDetectionID,
        date: document.getElementById("detailsDate").textContent,
        model: "EfficientNetB0 + Grad-CAM",
        prediction: document.getElementById("detailsPred").textContent,
        confidence: document.getElementById("detailsConf").textContent,
        processing_time: document.getElementById("detailsTime").textContent,
        explanation: document.getElementById("aiExplanation").textContent
      }
    };
    const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis-${currentDetectionID || 'result'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Analysis JSON downloaded.", "success");
  });

  // Save Result button manually triggers a success toast (already auto-saved)
  document.getElementById("saveResultBtn").addEventListener("click", () => {
    showToast("Result successfully saved to history!", "success");
  });

  // Share Report
  document.getElementById("shareBtn").addEventListener("click", () => {
    const pred = document.getElementById("detailsPred").textContent;
    const conf = document.getElementById("detailsConf").textContent;
    const model = document.getElementById("detailsModel").textContent;
    const shareText = `🔍 AI Image Detection Report\n📁 Image: ${currentFile.name}\n🚨 Prediction: ${pred}\n📈 Confidence: ${conf}\n🤖 Model: ${model}\nGenerated via CareerAi.`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        showToast("Report summary copied to clipboard!", "success");
      }).catch(() => {
        showToast("Failed to copy report to clipboard.", "error");
      });
    } else {
      alert(shareText);
    }
  });
}

function saveDetectionToHistory(prediction, confidence, base64Image) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  
  db.collection("detections").add({
    userId: user.uid,
    prediction: prediction,
    confidence: confidence,
    image: base64Image, // NOTE: In prod, upload to Storage and save URL instead to save DB space
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(err => {
    console.error("Failed to save detection to history:", err);
  });
}

// -------- History Page Logic --------
function initHistoryPage() {
  const historyPage = document.querySelector('[data-page="history"]');
  if (!historyPage) return;

  const contentDiv = document.getElementById("historyContent");
  const searchInput = document.getElementById("historySearch");
  const filterSelect = document.getElementById("historyFilter");
  const sortSelect = document.getElementById("historySort");
  const clearBtn = document.getElementById("clearHistoryBtn");
  
  const modal = document.getElementById("detailsModal");
  const closeBtn = document.getElementById("closeModalBtn");

  let allDetections = [];

  // Close modal
  closeBtn.addEventListener("click", () => modal.classList.remove("active"));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  // Fetch Data
  function loadHistory() {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    contentDiv.innerHTML = `<p style="text-align:center; color:var(--text-secondary); padding: 40px;">Loading history...</p>`;
    
    db.collection("detections")
      .where("userId", "==", user.uid)
      .get()
      .then((snapshot) => {
        allDetections = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestampMs: data.timestamp ? data.timestamp.toMillis() : Date.now()
          };
        });
        renderTable();
      })
      .catch((err) => {
        console.error("Error fetching history:", err);
        contentDiv.innerHTML = `<p style="text-align:center; color:var(--danger); padding: 40px;">Failed to load history.</p>`;
      });
  }

  function renderTable() {
    let filtered = [...allDetections];
    
    // 1. Search
    const searchVal = searchInput.value.toLowerCase().trim();
    if (searchVal) {
      filtered = filtered.filter(item => 
        (item.prediction && item.prediction.toLowerCase().includes(searchVal)) ||
        (item.id.toLowerCase().includes(searchVal))
      );
    }
    
    // 2. Filter
    const filterVal = filterSelect.value;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (filterVal === "real") {
      filtered = filtered.filter(i => i.prediction === "Real");
    } else if (filterVal === "ai") {
      filtered = filtered.filter(i => i.prediction !== "Real");
    } else if (filterVal === "today") {
      filtered = filtered.filter(i => (now - i.timestampMs) < oneDay);
    } else if (filterVal === "week") {
      filtered = filtered.filter(i => (now - i.timestampMs) < (7 * oneDay));
    } else if (filterVal === "month") {
      filtered = filtered.filter(i => (now - i.timestampMs) < (30 * oneDay));
    }
    
    // 3. Sort
    const sortVal = sortSelect.value;
    filtered.sort((a, b) => {
      if (sortVal === "newest") return b.timestampMs - a.timestampMs;
      if (sortVal === "oldest") return a.timestampMs - b.timestampMs;
      if (sortVal === "confidence_high") return parseFloat(b.confidence) - parseFloat(a.confidence);
      if (sortVal === "confidence_low") return parseFloat(a.confidence) - parseFloat(b.confidence);
      return 0;
    });
    
    // 4. Render
    if (filtered.length === 0) {
      contentDiv.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <p class="empty-state-text">No detection history found.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="history-table-wrap">
        <table class="history-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Prediction</th>
              <th>Confidence</th>
              <th>Date</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    filtered.forEach(item => {
      const dateStr = new Date(item.timestampMs).toLocaleString();
      const isReal = item.prediction === "Real";
      const tagClass = isReal ? "tag-real" : "tag-ai";
      
      html += `
        <tr>
          <td>
            <img class="history-thumb" src="${item.image || ''}" alt="Thumb" onerror="this.src=''; this.style.backgroundColor='#1a1636';" />
          </td>
          <td><span class="tag ${tagClass}">${item.prediction}</span></td>
          <td>${item.confidence}%</td>
          <td style="color:var(--text-secondary); font-size:0.8rem;">${dateStr}</td>
          <td style="text-align: right;">
            <button class="btn-secondary view-btn" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.8rem; border-color: var(--info); color: var(--info);">View</button>
            <button class="btn-danger delete-btn" data-id="${item.id}" style="padding: 6px 12px; font-size: 0.8rem;">Delete</button>
          </td>
        </tr>
      `;
    });
    
    html += `</tbody></table></div>`;
    contentDiv.innerHTML = html;
    
    // Attach event listeners to generated buttons
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        openModal(id);
      });
    });
    
    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        deleteDetection(id);
      });
    });
  }

  // Open Details Modal
  function openModal(id) {
    const item = allDetections.find(d => d.id === id);
    if (!item) return;
    
    const isReal = item.prediction === "Real";
    const dateStr = new Date(item.timestampMs).toLocaleString();
    
    document.getElementById("modalPrediction").textContent = item.prediction;
    document.getElementById("modalPrediction").className = `result-badge ${isReal ? 'real' : 'ai'}`;
    document.getElementById("modalConfidence").textContent = `${item.confidence}%`;
    document.getElementById("modalDate").textContent = dateStr;
    
    document.getElementById("modalOriginalImg").src = item.image || '';
    
    const heatmap = document.getElementById("modalHeatmapImg");
    heatmap.src = item.image || '';
    // Apply mock heatmap effect
    heatmap.style.filter = "sepia(100%) hue-rotate(-50deg) saturate(300%) contrast(150%) blur(1px)";
    
    const explanation = isReal 
      ? "The model detected natural texture gradients, consistent lighting, and realistic edge transitions typical of authentic photography." 
      : "The model focused on synthetic noise patterns, overly smooth localized regions, and unnatural high-frequency artifacts often left by GANs or Diffusion models.";
    document.getElementById("modalExplanation").textContent = explanation;
    
    modal.classList.add("active");
  }

  // Delete Single
  function deleteDetection(id) {
    if (!confirm("Are you sure you want to delete this detection record?")) return;
    
    db.collection("detections").doc(id).delete().then(() => {
      allDetections = allDetections.filter(d => d.id !== id);
      renderTable();
    }).catch(err => {
      console.error("Error deleting document:", err);
      alert("Failed to delete record.");
    });
  }

  // Clear All
  clearBtn.addEventListener("click", () => {
    if (allDetections.length === 0) {
      alert("History is already empty.");
      return;
    }
    if (!confirm("Are you sure you want to delete ALL detection history? This cannot be undone.")) return;
    
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    clearBtn.textContent = "Clearing...";
    clearBtn.disabled = true;
    
    const batch = db.batch();
    allDetections.forEach(item => {
      const ref = db.collection("detections").doc(item.id);
      batch.delete(ref);
    });
    
    batch.commit().then(() => {
      allDetections = [];
      renderTable();
      clearBtn.textContent = "🗑 Clear All History";
      clearBtn.disabled = false;
    }).catch(err => {
      console.error("Batch delete failed:", err);
      alert("Failed to clear history.");
      clearBtn.textContent = "🗑 Clear All History";
      clearBtn.disabled = false;
    });
  });

  // Listeners for Filter/Sort/Search
  searchInput.addEventListener("input", renderTable);
  filterSelect.addEventListener("change", renderTable);
  sortSelect.addEventListener("change", renderTable);

  // Wait for auth to initialize before loading history
  firebase.auth().onAuthStateChanged((user) => {
    if (user) loadHistory();
  });
}

// Initialize everything once the DOM is ready

function initProfilePage(user) {
  let selectedAvatarUrl = '';

  const avatarCategories = {
    space: ['astronaut', 'rocket', 'galaxy', 'alien', 'comet', 'ufo'],
    travel: ['airplane', 'mountain', 'compass', 'beach', 'camera', 'passport'],
    food: ['pizza', 'burger', 'sushi', 'taco', 'donut', 'ramen'],
    nature: ['forest', 'flower', 'tiger', 'wolf', 'lion', 'panda'],
    anime: ['cyberpunk', 'robot', 'ninja', 'samurai', 'hacker', 'gamer']
  };

  function renderAvatarGrid(category) {
    const grid = document.getElementById("avatarGrid");
    if (!grid) return;
    const seeds = avatarCategories[category] || avatarCategories.space;
    grid.innerHTML = seeds.map(seed => {
      const url = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=0f111e`;
      const isSelected = selectedAvatarUrl === url;
      return `
        <div class="avatar-item ${isSelected ? 'selected' : ''}" data-url="${url}">
          <img src="${url}" alt="${seed}" />
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.avatar-item').forEach(item => {
      item.addEventListener('click', () => {
        grid.querySelectorAll('.avatar-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedAvatarUrl = item.getAttribute('data-url');
        // Update main profile avatar preview
        const initialsEl = document.getElementById("profileInitials");
        if (initialsEl) {
          initialsEl.innerHTML = `<img src="${selectedAvatarUrl}" alt="Avatar" />`;
        }
      });
    });
  }

  // Category tab listener
  document.querySelectorAll('.avatar-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.avatar-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');
      renderAvatarGrid(cat);
    });
  });

  // Fetch and display profile info
  fetchUserProfile(user.uid).then((doc) => {
    const data = doc.exists ? (doc.data() || {}) : {};
    const rawName = data.fullName || user.displayName || '';
    const fullName = (rawName && rawName !== 'null') ? rawName : (user.email ? user.email.split('@')[0] : 'User');
    const username = data.username || '';
    selectedAvatarUrl = data.avatarUrl || '';

    // Profile card display
    const initialsEl = document.getElementById("profileInitials");
    if (initialsEl) {
      if (selectedAvatarUrl) {
        initialsEl.innerHTML = `<img src="${selectedAvatarUrl}" alt="Avatar" />`;
      } else {
        initialsEl.textContent = fullName.charAt(0).toUpperCase();
      }
    }
    const nameEl = document.getElementById("profileName");
    if (nameEl) nameEl.textContent = fullName;
    const emailEl = document.getElementById("profileEmail");
    if (emailEl) emailEl.textContent = user.email;

    // Pre-fill form fields
    const fullNameInput = document.getElementById("updateFullName");
    if (fullNameInput) fullNameInput.value = data.fullName || '';
    const usernameInput = document.getElementById("updateUsername");
    if (usernameInput) usernameInput.value = username;

    // Initial grid render
    renderAvatarGrid('space');

    // Update sidebar
    updateSidebarUser(fullName, username, selectedAvatarUrl);
  }).catch(() => {
    const fallback = user.email ? user.email.split('@')[0] : 'User';
    const initialsEl = document.getElementById("profileInitials");
    if (initialsEl) initialsEl.textContent = fallback.charAt(0).toUpperCase();
    const nameEl = document.getElementById("profileName");
    if (nameEl) nameEl.textContent = fallback;
    const emailEl = document.getElementById("profileEmail");
    if (emailEl) emailEl.textContent = user.email;
    renderAvatarGrid('space');
    updateSidebarUser(fallback, '');
  });

  // Save changes handler
  const saveBtn = document.getElementById("saveProfileBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const fullNameVal = document.getElementById("updateFullName").value.trim();
      const usernameVal = document.getElementById("updateUsername").value.trim();
      const newPasswordVal = document.getElementById("newPassword")?.value.trim();

      const updates = {};
      if (fullNameVal) updates.fullName = fullNameVal;
      if (usernameVal) updates.username = usernameVal;
      if (selectedAvatarUrl) updates.avatarUrl = selectedAvatarUrl;

      if (Object.keys(updates).length === 0 && !newPasswordVal) {
        alert("Nothing to update.");
        return;
      }

      const promises = [];

      if (Object.keys(updates).length > 0) {
        promises.push(db.collection('users').doc(user.uid).set(updates, { merge: true }));
      }

      if (newPasswordVal) {
        if (newPasswordVal.length < 6) {
          alert("Password must be at least 6 characters.");
          return;
        }
        promises.push(user.updatePassword(newPasswordVal));
      }

      Promise.all(promises)
        .then(() => {
          alert("✅ Profile updated successfully!");
          if (newPasswordVal && document.getElementById("newPassword")) {
            document.getElementById("newPassword").value = '';
          }
          // Refresh profile card
          if (updates.fullName) {
            const nameEl = document.getElementById("profileName");
            if (nameEl) nameEl.textContent = updates.fullName;
          }
          // Refresh sidebar immediately
          const newName = updates.fullName || document.getElementById("profileName")?.textContent || '';
          const newUsername = updates.username || document.getElementById("updateUsername")?.value || '';
          updateSidebarUser(newName, newUsername, selectedAvatarUrl);
        })
        .catch((err) => {
          console.error("Profile update failed:", err);
          alert(err.message || "Failed to update profile.");
        });
    });
  }
}

// -------- Analytics Page Logic --------
function initAnalyticsPage() {
  const analyticsPage = document.querySelector('[data-page="analytics"]');
  if (!analyticsPage) return;

  renderSidebar();

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // Set chart globals for dark theme
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';

    db.collection("detections").where("userId", "==", user.uid).get()
      .then(snapshot => {
        const docs = snapshot.docs.map(doc => ({ ...doc.data(), timestampMs: doc.data().timestamp ? doc.data().timestamp.toMillis() : Date.now() }));
        
        let realCount = 0;
        let aiCount = 0;
        let totalConfidence = 0;

        // For Line Chart: Group by Date (YYYY-MM-DD)
        const dateCounts = {};
        
        // For Bar Chart: Group by Category
        const categoryCounts = { 'Real': 0, 'AI Generated': 0 };

        docs.forEach(doc => {
          if (doc.prediction === "Real") {
            realCount++;
            categoryCounts['Real']++;
          } else {
            aiCount++;
            categoryCounts['AI Generated']++;
          }
          totalConfidence += parseFloat(doc.confidence || 0);

          const dateObj = new Date(doc.timestampMs);
          const dateStr = dateObj.toISOString().split('T')[0];
          if (!dateCounts[dateStr]) dateCounts[dateStr] = { real: 0, ai: 0, total: 0 };
          
          if (doc.prediction === "Real") dateCounts[dateStr].real++;
          else dateCounts[dateStr].ai++;
          dateCounts[dateStr].total++;
        });

        // 1. Average Confidence Score
        const totalDocs = docs.length;
        const avgConf = totalDocs > 0 ? (totalConfidence / totalDocs).toFixed(1) : 0;
        document.getElementById("avgConfidenceScore").textContent = `${avgConf}%`;

        // 2. Pie Chart (Real vs AI)
        const pieCtx = document.getElementById('pieChart');
        if (pieCtx) {
          new Chart(pieCtx, {
            type: 'doughnut',
            data: {
              labels: ['Real', 'AI-Generated'],
              datasets: [{
                data: [realCount, aiCount],
                backgroundColor: ['#1de9b6', '#e040fb'],
                borderColor: '#05050f',
                borderWidth: 2,
                hoverOffset: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' }
              }
            }
          });
        }

        // 3. Bar Chart (Categories)
        const barCtx = document.getElementById('barChart');
        if (barCtx) {
          new Chart(barCtx, {
            type: 'bar',
            data: {
              labels: ['Real', 'AI Generated'],
              datasets: [{
                label: 'Total Detections',
                data: [categoryCounts['Real'], categoryCounts['AI Generated']],
                backgroundColor: ['rgba(29, 233, 182, 0.6)', 'rgba(224, 64, 251, 0.6)'],
                borderColor: ['#1de9b6', '#e040fb'],
                borderWidth: 1,
                borderRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
              },
              plugins: {
                legend: { display: false }
              }
            }
          });
        }

        // 4. Line Chart (Over Time)
        const sortedDates = Object.keys(dateCounts).sort();
        const lineCtx = document.getElementById('lineChart');
        if (lineCtx) {
          new Chart(lineCtx, {
            type: 'line',
            data: {
              labels: sortedDates,
              datasets: [
                {
                  label: 'Real',
                  data: sortedDates.map(d => dateCounts[d].real),
                  borderColor: '#1de9b6',
                  backgroundColor: 'rgba(29, 233, 182, 0.1)',
                  tension: 0.3,
                  fill: true
                },
                {
                  label: 'AI-Generated',
                  data: sortedDates.map(d => dateCounts[d].ai),
                  borderColor: '#e040fb',
                  backgroundColor: 'rgba(224, 64, 251, 0.1)',
                  tension: 0.3,
                  fill: true
                },
                {
                  label: 'Total',
                  data: sortedDates.map(d => dateCounts[d].total),
                  borderColor: '#00e5ff',
                  borderDash: [5, 5],
                  tension: 0.3,
                  fill: false
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
              },
              interaction: {
                mode: 'index',
                intersect: false,
              }
            }
          });
        }
      })
      .catch(err => console.error("Error fetching analytics data:", err));
  });
}

// -------- News & Saved News Logic --------
async function toggleSaveArticle(article, btn) {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Please log in to save articles.");
  
  const savedRef = db.collection("saved_news").doc(user.uid + "_" + btoa(article.url).slice(0,20));
  
  try {
    const doc = await savedRef.get();
    if (doc.exists) {
      await savedRef.delete();
      btn.classList.remove('saved');
      btn.textContent = '⭐ Save';
      showToast("Article removed from saved.", "success");
    } else {
      await savedRef.set({
        userId: user.uid,
        title: article.title,
        url: article.url,
        urlToImage: article.urlToImage,
        sourceName: article.source.name,
        publishedAt: article.publishedAt,
        description: article.description,
        savedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      btn.classList.add('saved');
      btn.textContent = '🌟 Saved';
      showToast("Article saved successfully!", "success");
    }
  } catch(e) {
    console.error(e);
    showToast("Error saving article.", "error");
  }
}

async function toggleLikeArticle(articleUrl, btn) {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Please log in to like articles.");
  
  const likedRef = db.collection("liked_news").doc(user.uid + "_" + btoa(articleUrl).slice(0,20));
  
  try {
    const doc = await likedRef.get();
    if (doc.exists) {
      await likedRef.delete();
      btn.classList.remove('liked');
      btn.textContent = '🤍 Like';
    } else {
      await likedRef.set({
        userId: user.uid,
        url: articleUrl,
        likedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      btn.classList.add('liked');
      btn.textContent = '❤️ Liked';
    }
  } catch(e) {
    console.error(e);
  }
}

function renderNewsGrid(articles, containerId, userSavedUrls = new Set(), userLikedUrls = new Set()) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!articles || articles.length === 0) {
    container.innerHTML = '<div class="news-loading">No articles found.</div>';
    return;
  }

  articles.forEach(article => {
    // Skip articles that are removed or [Removed]
    if (article.title === "[Removed]") return;
    
    const isSaved = userSavedUrls.has(article.url);
    const isLiked = userLikedUrls.has(article.url);
    
    const card = document.createElement('div');
    card.className = 'news-card';
    
    const dateStr = new Date(article.publishedAt).toLocaleDateString();
    const imgSrc = article.urlToImage || 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop';
    
    card.innerHTML = `
      <img src="${imgSrc}" class="news-image" alt="News Image" onerror="this.src='https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&auto=format&fit=crop'" />
      <div class="news-content">
        <h3 class="news-title" title="${article.title}">${article.title}</h3>
        <p class="news-desc">${article.description || 'No description available.'}</p>
        <div class="news-meta">
          <span class="news-source">${article.source?.name || 'Unknown'}</span>
          <span>${dateStr}</span>
        </div>
        <div class="news-actions">
          <div style="display: flex; gap: 8px;">
            <button class="news-btn save-btn ${isSaved ? 'saved' : ''}">${isSaved ? '🌟 Saved' : '⭐ Save'}</button>
            <button class="news-btn like-btn ${isLiked ? 'liked' : ''}">${isLiked ? '❤️ Liked' : '🤍 Like'}</button>
          </div>
          <a href="${article.url}" target="_blank" class="news-read-more">Read More</a>
        </div>
      </div>
    `;

    // Attach event listeners
    const saveBtn = card.querySelector('.save-btn');
    const likeBtn = card.querySelector('.like-btn');
    
    saveBtn.addEventListener('click', () => toggleSaveArticle(article, saveBtn));
    likeBtn.addEventListener('click', () => toggleLikeArticle(article.url, likeBtn));

    container.appendChild(card);
  });
}

function fetchAndRenderNews(query = "artificial intelligence") {
  const container = document.getElementById("newsGrid");
  const loading = document.getElementById("newsLoading");
  if (!container || !loading) return;

  container.innerHTML = '';
  loading.style.display = 'flex';

  const user = firebase.auth().currentUser;
  
  // Fetch saved/liked statuses gracefully — don't block news if Firebase fails
  // Add a minimum 10-second delay to show the loading video
  const minDelay = new Promise(resolve => setTimeout(resolve, 10000));
  
  Promise.all([
    user ? db.collection("saved_news").where("userId", "==", user.uid).get().catch(() => ({docs:[]})) : Promise.resolve({docs:[]}),
    user ? db.collection("liked_news").where("userId", "==", user.uid).get().catch(() => ({docs:[]})) : Promise.resolve({docs:[]}),
    fetch(`http://127.0.0.1:5000/api/news?q=${encodeURIComponent(query)}`).then(res => res.json()).catch(err => { console.error(err); return null; }),
    minDelay
  ]).then(([savedSnap, likedSnap, data]) => {
    const savedUrls = new Set(savedSnap.docs.map(d => d.data().url));
    const likedUrls = new Set(likedSnap.docs.map(d => d.data().url));

    loading.style.display = 'none';
    
    if (data && data.articles) {
      renderNewsGrid(data.articles, "newsGrid", savedUrls, likedUrls);
    } else {
      container.innerHTML = '<div class="news-loading" style="padding: 40px; text-align: center;">Error fetching news. Backend might be down.</div>';
    }
  });
}

function initNewsPage() {
  const newsPage = document.querySelector('[data-page="news"]');
  if (!newsPage) return;

  renderSidebar();

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    
    // Check trending tags
    document.querySelectorAll(".trending-tag").forEach(tag => {
      tag.addEventListener("click", () => {
        document.getElementById("newsSearch").value = tag.textContent;
        fetchAndRenderNews(tag.textContent);
      });
    });

    // Category chips
    const chips = document.querySelectorAll("#newsCategories .chip");
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        fetchAndRenderNews(chip.getAttribute('data-category'));
      });
    });

    // Search
    document.getElementById("newsSearchBtn").addEventListener("click", () => {
      const q = document.getElementById("newsSearch").value.trim();
      if (q) fetchAndRenderNews(q);
    });
    
    document.getElementById("newsSearch").addEventListener("keypress", (e) => {
      if (e.key === 'Enter') {
        const q = document.getElementById("newsSearch").value.trim();
        if (q) fetchAndRenderNews(q);
      }
    });

    // Initial load
    fetchAndRenderNews("artificial intelligence");
  });
}

function initSavedNewsPage() {
  const savedNewsPage = document.querySelector('[data-page="saved_news"]');
  if (!savedNewsPage) return;
  
  renderSidebar();

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    const container = document.getElementById("savedNewsGrid");
    const loading = document.getElementById("savedNewsLoading");
    const tabSaved = document.getElementById("tabSaved");
    const tabLiked = document.getElementById("tabLiked");

    let currentSavedUrls = new Set();
    let currentLikedUrls = new Set();
    let allSavedDocs = [];

    function loadSavedArticles() {
      container.innerHTML = '';
      loading.style.display = 'block';
      tabSaved.classList.add('active');
      tabLiked.classList.remove('active');

      Promise.all([
        db.collection("saved_news").where("userId", "==", user.uid).get(),
        db.collection("liked_news").where("userId", "==", user.uid).get()
      ]).then(([savedSnap, likedSnap]) => {
        currentSavedUrls = new Set(savedSnap.docs.map(d => d.data().url));
        currentLikedUrls = new Set(likedSnap.docs.map(d => d.data().url));
        allSavedDocs = savedSnap.docs.map(d => d.data());
        
        loading.style.display = 'none';
        // Mock NewsAPI article structure so renderNewsGrid works
        const articles = allSavedDocs.map(d => ({
          title: d.title,
          url: d.url,
          urlToImage: d.urlToImage,
          source: { name: d.sourceName },
          publishedAt: d.publishedAt,
          description: d.description
        }));
        renderNewsGrid(articles, "savedNewsGrid", currentSavedUrls, currentLikedUrls);
      });
    }

    function loadLikedArticles() {
      container.innerHTML = '';
      loading.style.display = 'block';
      tabLiked.classList.add('active');
      tabSaved.classList.remove('active');

      // Note: we don't have the full article payload in liked_news, only the URL.
      // So displaying liked articles perfectly is tricky unless we also saved the full payload when liking.
      // For this implementation, we will query saved_news to find matching articles. 
      // If they liked but didn't save, we won't have the full payload. 
      // Let's filter allSavedDocs for now.
      
      db.collection("liked_news").where("userId", "==", user.uid).get().then(likedSnap => {
        currentLikedUrls = new Set(likedSnap.docs.map(d => d.data().url));
        const filteredDocs = allSavedDocs.filter(d => currentLikedUrls.has(d.url));
        
        loading.style.display = 'none';
        const articles = filteredDocs.map(d => ({
          title: d.title,
          url: d.url,
          urlToImage: d.urlToImage,
          source: { name: d.sourceName },
          publishedAt: d.publishedAt,
          description: d.description
        }));
        
        if (articles.length === 0) {
          container.innerHTML = '<div class="news-loading">No liked articles found with details. (Try saving them first)</div>';
        } else {
          renderNewsGrid(articles, "savedNewsGrid", currentSavedUrls, currentLikedUrls);
        }
      });
    }

    tabSaved.addEventListener("click", loadSavedArticles);
    tabLiked.addEventListener("click", loadLikedArticles);

    // Initial load
    loadSavedArticles();
  });
}

// Initialize everything once the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // If we are on login or register page, redirect if already logged in
  const isAuthPage = document.getElementById("loginForm") || document.getElementById("registerForm");
  if (isAuthPage) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        window.location.replace("dashboard.html");
      }
    });
  }

  initPasswordToggles();
  initLoginForm();
  initRegisterForm();
  initDashboard();
  initDetectPage();
  initHistoryPage();
  initAnalyticsPage();
  initNewsPage();
  initSavedNewsPage();
  initQuillChatbot();

  // Profile page: wait for auth then init
  if (document.querySelector('[data-page="profile"]')) {
    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = "index.html";
        return;
      }
      initProfilePage(user);
    });
  }
});

// --- Quill Chatbot Logic ---
function initQuillChatbot() {
  // Prevent duplicate injections
  if (document.getElementById('quill-chatbot')) return;

  const chatHTML = `
<div id="quill-chatbot" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: 'Outfit', sans-serif;">
  <!-- Chat Window -->
  <div id="quill-window" style="display: none; width: 350px; height: 500px; background: #121212; border: 1px solid #333; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); flex-direction: column; overflow: hidden; margin-bottom: 15px;">
    <!-- Header -->
    <div style="background: -webkit-linear-gradient(45deg, #3b82f6, #a855f7); padding: 15px; color: white; display: flex; justify-content: space-between; align-items: center;">
      <strong style="font-size: 1.2rem; display: flex; align-items: center; gap: 8px;">🤖 Quill</strong>
      <span id="quill-close" style="cursor: pointer; font-size: 1.5rem; line-height: 1;">&times;</span>
    </div>
    <!-- Messages Area -->
    <div id="quill-messages" style="flex: 1; padding: 15px; overflow-y: auto; background: #1a1a2e; display: flex; flex-direction: column; gap: 12px;">
      <div style="align-self: flex-start; background: #2a2a4a; padding: 12px 16px; border-radius: 12px; border-bottom-left-radius: 4px; color: #fff; font-size: 0.95rem; max-width: 85%; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
        Hi! I am Quill. ImagScanner scans your images to detect whether they are real or AI-generated. How can I help you today?
      </div>
    </div>
    <!-- Input Area -->
    <div style="padding: 12px; background: #121212; border-top: 1px solid #333; display: flex; gap: 8px;">
      <input type="text" id="quill-input" placeholder="Ask Quill..." style="flex: 1; padding: 12px 16px; border-radius: 24px; border: 1px solid #444; background: #222; color: white; outline: none; font-size: 0.95rem;" />
      <button id="quill-send" style="background: -webkit-linear-gradient(45deg, #3b82f6, #a855f7); border: none; border-radius: 50%; width: 44px; height: 44px; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4);">
        <span style="transform: rotate(45deg); font-size: 1.2rem; margin-right: 2px;">➤</span>
      </button>
    </div>
  </div>
  
  <!-- Floating Button -->
  <button id="quill-toggle" style="background: -webkit-linear-gradient(45deg, #3b82f6, #a855f7); width: 64px; height: 64px; border-radius: 50%; border: none; color: white; font-size: 2rem; cursor: pointer; box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5); display: flex; align-items: center; justify-content: center; float: right; transition: transform 0.2s;">
    💬
  </button>
</div>
  `;
  document.body.insertAdjacentHTML('beforeend', chatHTML);

  const toggleBtn = document.getElementById('quill-toggle');
  const closeBtn = document.getElementById('quill-close');
  const chatWindow = document.getElementById('quill-window');
  const inputField = document.getElementById('quill-input');
  const sendBtn = document.getElementById('quill-send');
  const messagesArea = document.getElementById('quill-messages');

  let isOpen = false;
  
  const toggleChat = () => {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) {
      inputField.focus();
    }
  };

  toggleBtn.addEventListener('click', toggleChat);
  toggleBtn.addEventListener('mouseenter', () => toggleBtn.style.transform = 'scale(1.05)');
  toggleBtn.addEventListener('mouseleave', () => toggleBtn.style.transform = 'scale(1)');
  closeBtn.addEventListener('click', toggleChat);

  // API key loaded from config.js (gitignored) or set as empty string
  const API_KEY = (typeof window.__CONFIG !== 'undefined' && window.__CONFIG.GCP_API_KEY) || "";

  const messageHistory = [];

  const appendMessage = (content, sender) => {
    const msgDiv = document.createElement('div');
    msgDiv.style.padding = '12px 16px';
    msgDiv.style.borderRadius = '12px';
    msgDiv.style.fontSize = '0.9rem';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.wordBreak = 'break-word';
    msgDiv.style.lineHeight = '1.6';
    msgDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    
    if (sender === 'user') {
      msgDiv.style.alignSelf = 'flex-end';
      msgDiv.style.background = '#3b82f6';
      msgDiv.style.color = '#fff';
      msgDiv.style.borderBottomRightRadius = '4px';
      msgDiv.textContent = content;
    } else {
      msgDiv.style.alignSelf = 'flex-start';
      msgDiv.style.background = '#2a2a4a';
      msgDiv.style.color = '#fff';
      msgDiv.style.borderBottomLeftRadius = '4px';

      // Convert markdown to clean readable HTML
      const formatMarkdown = (text) => {
        const lines = text.split('\n');
        let html = '';
        let inList = false;
        let listType = '';

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) {
            if (inList) { html += listType === 'ol' ? '</ol>' : '</ul>'; inList = false; }
            return;
          }
          // Numbered list: "1. item"
          const numMatch = trimmed.match(/^(\d+)\.\s+\*{0,2}(.+?)\*{0,2}:?\s*(.*)/);
          if (numMatch) {
            if (!inList || listType !== 'ol') {
              if (inList) html += listType === 'ol' ? '</ol>' : '</ul>';
              html += '<ol style="margin:6px 0 6px 18px; padding:0;">';
              inList = true; listType = 'ol';
            }
            const label = numMatch[2];
            const rest = numMatch[3];
            html += `<li style="margin-bottom:5px;"><strong>${label}</strong>${rest ? ': ' + rest : ''}</li>`;
            return;
          }
          // Bullet list: "- item" or "* item"
          const bulletMatch = trimmed.match(/^[-*]\s+\*{0,2}(.+?)\*{0,2}:?\s*(.*)/);
          if (bulletMatch) {
            if (!inList || listType !== 'ul') {
              if (inList) html += listType === 'ol' ? '</ol>' : '</ul>';
              html += '<ul style="margin:6px 0 6px 18px; padding:0; list-style:disc;">';
              inList = true; listType = 'ul';
            }
            html += `<li style="margin-bottom:4px;">${bulletMatch[1]}${bulletMatch[2] ? ': ' + bulletMatch[2] : ''}</li>`;
            return;
          }
          // Regular text
          if (inList) { html += listType === 'ol' ? '</ol>' : '</ul>'; inList = false; }
          // Strip remaining ** markers and render as paragraph
          const clean = trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '$1');
          html += `<p style="margin:4px 0;">${clean}</p>`;
        });

        if (inList) html += listType === 'ol' ? '</ol>' : '</ul>';
        return html;
      };

      msgDiv.innerHTML = formatMarkdown(content);
    }
    
    messagesArea.appendChild(msgDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  };

  const sendMessage = async () => {
    const text = inputField.value.trim();
    if (!text) return;
    
    inputField.value = '';
    appendMessage(text, 'user');
    
    messageHistory.push({ role: "user", parts: [{ text }] });
    
    const typingDiv = document.createElement('div');
    typingDiv.textContent = 'Quill is typing...';
    typingDiv.style.alignSelf = 'flex-start';
    typingDiv.style.fontSize = '0.85rem';
    typingDiv.style.color = '#888';
    typingDiv.style.padding = '4px 16px';
    typingDiv.id = 'quill-typing';
    messagesArea.appendChild(typingDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;

    // --- Groq AI (Free, fast Llama 3) ---
    // API key loaded from config.js (gitignored) or set as empty string
    const GROQ_API_KEY = (typeof window.__CONFIG !== 'undefined' && window.__CONFIG.GROQ_API_KEY) || "";
    
    if (GROQ_API_KEY) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: "system", content: "You are Quill, a helpful AI assistant for the web app 'ImagScanner'. ImagScanner is a tool that scans images to detect whether they are real or AI-generated using a deep learning model (EfficientNet) and Grad-CAM heatmaps. Answer questions concisely and helpfully." },
              ...messageHistory.map(m => ({ role: m.role === "model" ? "assistant" : m.role, content: m.parts[0].text }))
            ]
          })
        });
        const data = await response.json();
        const tDiv = document.getElementById('quill-typing');
        if (tDiv) tDiv.remove();
        if (response.ok && data.choices && data.choices[0]) {
          const reply = data.choices[0].message.content;
          appendMessage(reply, 'assistant');
          messageHistory.push({ role: "model", parts: [{ text: reply }] });
        } else {
          const err = data.error && data.error.message ? data.error.message : "Unknown error";
          appendMessage("API Error: " + err, 'assistant');
        }
      } catch (err) {
        const tDiv = document.getElementById('quill-typing');
        if (tDiv) tDiv.remove();
        appendMessage("Connection error: " + err.message, 'assistant');
      }
    } else {
      // Smart keyword demo responses
      setTimeout(() => {
        const tDiv = document.getElementById('quill-typing');
        if (tDiv) tDiv.remove();
        const t = text.toLowerCase();
        let reply = "Great question! ImagScanner uses deep learning to analyze images and detect AI generation. You can upload any image on the 'Detect Image' page to get an instant result with a confidence score!";
        if (t.match(/^(hi|hello|hey|hiya|howdy)[\s!?]*$/)) reply = "Hello! 👋 I'm Quill, your ImagScanner assistant. I can help you understand how our AI image detection works, answer questions about results, or guide you through the app. What would you like to know?";
        else if (t.includes("how") && t.includes("work")) reply = "ImagScanner uses an EfficientNet deep learning model trained on thousands of real and AI-generated images. When you upload an image, it analyzes subtle pixel patterns and artifacts that AI generators leave behind. It returns a confidence score and a Grad-CAM heatmap highlighting suspicious regions!";
        else if (t.includes("heatmap") || t.includes("grad")) reply = "The Grad-CAM heatmap highlights regions of the image that most influenced the AI's decision. Hot (red/orange) areas are the ones that look most 'AI-like' to the model. It's a great way to understand *why* an image was flagged!";
        else if (t.includes("accuracy") || t.includes("accurate") || t.includes("how good")) reply = "ImagScanner achieves strong detection accuracy on most AI-generated images. However, no detector is perfect — very high-quality AI images may occasionally fool the model. Always use it as a helpful indicator, not a definitive judgment!";
        else if (t.includes("upload") || t.includes("how to use") || t.includes("detect")) reply = "To detect an image: click 'Detect Image' in the sidebar → upload your image → click Analyze. You'll get a real/AI prediction with a confidence percentage and a visual heatmap in seconds!";
        else if (t.includes("history")) reply = "Your detection history is saved automatically! Click 'History' in the sidebar to see all your past scans with timestamps and prediction results.";
        else if (t.includes("news")) reply = "The 'AI News' section keeps you updated with the latest developments in AI image generation and detection technology. You can also save articles to read later!";
        else if (t.includes("who are you") || t.includes("your name") || t.includes("what are you")) reply = "I'm Quill 🤖 — your built-in AI assistant for ImagScanner! I'm here to help you navigate the app, understand your results, and answer questions about AI image detection.";
        else if (t.includes("fake") || t.includes("ai generated") || t.includes("ai image")) reply = "AI-generated images often contain subtle inconsistencies — unnatural textures, warped backgrounds, or unusual lighting. ImagScanner's model is specifically trained to spot these patterns that are invisible to the human eye!";
        else if (t.includes("real") && t.includes("image")) reply = "Real photographs have natural noise, lens distortion, and lighting physics that AI generators struggle to perfectly replicate. Our model is trained to recognize these 'signatures of reality'!";
        else if (t.includes("thank")) reply = "You're welcome! 😊 Feel free to ask me anything else about ImagScanner!";
        else if (t.includes("profile")) reply = "Your profile page shows your account details and statistics. You can view your total scans, real vs AI-generated breakdown, and manage your account settings there!";
        appendMessage(reply, 'assistant');
        messageHistory.push({ role: "model", parts: [{ text: reply }] });
      }, 900);
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}
