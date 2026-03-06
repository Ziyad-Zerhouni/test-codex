const store = {
  get(key, fallback) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const initialUsers = [
  { username: "alice", bio: "Builder • Photographer", following: ["bob"] },
  { username: "bob", bio: "Tech enthusiast", following: [] },
  { username: "charlie", bio: "Coffee + code", following: [] }
];

const initialPosts = [
  {
    id: crypto.randomUUID(),
    author: "alice",
    text: "Just launched PulseNet 🚀 #launch #social",
    image: "",
    tags: ["launch", "social"],
    likes: ["bob"],
    comments: [{ by: "charlie", text: "Congrats!" }],
    reposts: 1,
    createdAt: new Date().toISOString()
  }
];

const state = {
  users: store.get("users", initialUsers),
  posts: store.get("posts", initialPosts),
  stories: store.get("stories", []),
  dms: store.get("dms", []),
  notifications: store.get("notifications", []),
  bookmarks: store.get("bookmarks", []),
  currentUser: store.get("currentUser", "alice"),
  theme: store.get("theme", "light")
};

const el = (id) => document.getElementById(id);

function persist() {
  Object.entries(state).forEach(([k, v]) => store.set(k, v));
}

function notify(text) {
  state.notifications.unshift({ text, at: new Date().toLocaleString() });
  persist();
  renderNotifications();
}

function currentProfile() {
  return state.users.find((u) => u.username === state.currentUser);
}

function ensureUser(name) {
  if (!state.users.some((u) => u.username === name)) {
    state.users.push({ username: name, bio: "", following: [] });
  }
}

function renderFeed(filter = "") {
  const list = el("feedList");
  const posts = [...state.posts]
    .filter((p) => {
      const text = `${p.author} ${p.text} ${p.tags.join(" ")}`.toLowerCase();
      return text.includes(filter.toLowerCase());
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  list.innerHTML = posts
    .map(
      (p) => `<article class="post">
        <strong>@${p.author}</strong>
        <p>${p.text}</p>
        ${p.image ? `<img src="${p.image}" alt="post image" />` : ""}
        <div>${p.tags.map((t) => `<span class="tag">#${t}</span>`).join("")}</div>
        <div class="muted">${new Date(p.createdAt).toLocaleString()}</div>
        <div>${p.comments.map((c) => `<div class="muted">${c.by}: ${c.text}</div>`).join("")}</div>
        <div class="action-row">
          <button onclick="likePost('${p.id}')">❤️ ${p.likes.length}</button>
          <button onclick="repost('${p.id}')">🔁 ${p.reposts}</button>
          <button onclick="commentPost('${p.id}')">💬 Comment</button>
          <button onclick="bookmarkPost('${p.id}')">🔖 Bookmark</button>
          <button onclick="sharePost('${p.id}')">📤 Share</button>
        </div>
      </article>`
    )
    .join("");
}

function renderPeople() {
  const profile = currentProfile();
  el("peopleList").innerHTML = state.users
    .filter((u) => u.username !== state.currentUser)
    .map((u) => {
      const following = profile.following.includes(u.username);
      return `<div class="post"><strong>@${u.username}</strong><p class="muted">${u.bio || "No bio"}</p>
      <button onclick="toggleFollow('${u.username}')">${following ? "Unfollow" : "Follow"}</button></div>`;
    })
    .join("");
}

function renderProfile() {
  const p = currentProfile();
  el("profileView").innerHTML = `<p><strong>@${p.username}</strong></p>
  <p>${p.bio || "No bio yet"}</p>
  <p class="muted">Following: ${p.following.length}</p>
  <p class="muted">Posts: ${state.posts.filter((x) => x.author === p.username).length}</p>`;
}

function renderTrending() {
  const counts = {};
  state.posts.forEach((p) => p.tags.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  el("trendingList").innerHTML = top.map(([tag, c]) => `<li>#${tag} (${c})</li>`).join("") || "<li>No tags yet</li>";
}

function renderStories() {
  el("storiesList").innerHTML = state.stories
    .slice(0, 8)
    .map((s) => `<div class="post"><strong>@${s.by}</strong><p>${s.text}</p><p class="muted">${s.at}</p></div>`)
    .join("");
}

function renderDMs() {
  el("dmList").innerHTML = state.dms
    .filter((m) => m.from === state.currentUser || m.to === state.currentUser)
    .map((m) => `<div class="post"><strong>${m.from} ➜ ${m.to}</strong><p>${m.body}</p><p class="muted">${m.at}</p></div>`)
    .join("");
}

function renderNotifications() {
  el("notificationsList").innerHTML = state.notifications
    .slice(0, 20)
    .map((n) => `<div class="post"><p>${n.text}</p><p class="muted">${n.at}</p></div>`)
    .join("");
}

function renderBookmarks() {
  const b = state.posts.filter((p) => state.bookmarks.includes(p.id));
  el("bookmarksList").innerHTML = b.map((p) => `<div class="post"><strong>@${p.author}</strong><p>${p.text}</p></div>`).join("") || "<p class='muted'>No bookmarks yet.</p>";
}

function renderExplore() {
  const q = el("searchInput").value;
  const posts = state.posts.filter((p) => `${p.author} ${p.text}`.toLowerCase().includes(q.toLowerCase()));
  const users = state.users.filter((u) => u.username.toLowerCase().includes(q.toLowerCase()));
  el("exploreResults").innerHTML = `
    <h3>Users</h3>
    ${users.map((u) => `<div class="post">@${u.username} <span class="muted">${u.bio}</span></div>`).join("") || "No users"}
    <h3>Posts</h3>
    ${posts.map((p) => `<div class="post"><strong>@${p.author}</strong><p>${p.text}</p></div>`).join("") || "No posts"}
  `;
}

window.likePost = (id) => {
  const p = state.posts.find((x) => x.id === id);
  if (!p.likes.includes(state.currentUser)) p.likes.push(state.currentUser);
  notify(`@${state.currentUser} liked a post by @${p.author}`);
  persist();
  renderFeed();
};

window.repost = (id) => {
  const p = state.posts.find((x) => x.id === id);
  p.reposts += 1;
  notify(`@${state.currentUser} reposted @${p.author}`);
  persist();
  renderFeed();
};

window.commentPost = (id) => {
  const text = prompt("Comment text:");
  if (!text) return;
  const p = state.posts.find((x) => x.id === id);
  p.comments.push({ by: state.currentUser, text });
  notify(`@${state.currentUser} commented on @${p.author}'s post`);
  persist();
  renderFeed();
};

window.bookmarkPost = (id) => {
  if (!state.bookmarks.includes(id)) state.bookmarks.push(id);
  persist();
  renderBookmarks();
};

window.sharePost = (id) => {
  const url = `${location.origin}${location.pathname}#post-${id}`;
  navigator.clipboard?.writeText(url);
  notify("Post link copied to clipboard");
};

window.toggleFollow = (username) => {
  const me = currentProfile();
  if (me.following.includes(username)) {
    me.following = me.following.filter((u) => u !== username);
    notify(`You unfollowed @${username}`);
  } else {
    me.following.push(username);
    notify(`You followed @${username}`);
  }
  persist();
  renderPeople();
  renderProfile();
};

function setAuthStatus() {
  el("authStatus").textContent = `Logged in as @${state.currentUser}`;
}

function mountEvents() {
  document.querySelectorAll(".tab-btn").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((x) => x.classList.remove("active"));
      document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      el(b.dataset.tab).classList.add("active");
    });
  });

  el("postBtn").addEventListener("click", () => {
    const text = el("postText").value.trim();
    if (!text) return;
    state.posts.push({
      id: crypto.randomUUID(),
      author: state.currentUser,
      text,
      image: el("imageUrl").value.trim(),
      tags: el("postTags")
        .value.split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      likes: [],
      comments: [],
      reposts: 0,
      createdAt: new Date().toISOString()
    });
    el("postText").value = "";
    el("imageUrl").value = "";
    el("postTags").value = "";
    notify(`@${state.currentUser} created a new post`);
    persist();
    refreshAll();
  });

  el("loginBtn").addEventListener("click", () => {
    const name = el("usernameInput").value.trim().toLowerCase();
    if (!name) return;
    ensureUser(name);
    state.currentUser = name;
    persist();
    setAuthStatus();
    refreshAll();
  });

  el("logoutBtn").addEventListener("click", () => {
    state.currentUser = "guest";
    ensureUser("guest");
    persist();
    setAuthStatus();
    refreshAll();
  });

  el("saveBioBtn").addEventListener("click", () => {
    currentProfile().bio = el("bioInput").value.trim();
    notify("Profile updated");
    persist();
    renderProfile();
    renderPeople();
  });

  el("sendDmBtn").addEventListener("click", () => {
    const to = el("dmTo").value.trim().toLowerCase();
    const body = el("dmBody").value.trim();
    if (!to || !body) return;
    ensureUser(to);
    state.dms.unshift({ from: state.currentUser, to, body, at: new Date().toLocaleString() });
    el("dmBody").value = "";
    notify(`DM sent to @${to}`);
    persist();
    renderDMs();
  });

  el("searchInput").addEventListener("input", () => {
    renderExplore();
    renderFeed(el("searchInput").value);
  });

  el("addStoryBtn").addEventListener("click", () => {
    const text = el("storyInput").value.trim();
    if (!text) return;
    state.stories.unshift({ by: state.currentUser, text, at: new Date().toLocaleString() });
    el("storyInput").value = "";
    notify("Story published");
    persist();
    renderStories();
  });

  el("themeToggle").addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    document.body.classList.toggle("dark", state.theme === "dark");
    persist();
  });
}

function refreshAll() {
  setAuthStatus();
  renderFeed();
  renderPeople();
  renderProfile();
  renderTrending();
  renderStories();
  renderDMs();
  renderNotifications();
  renderBookmarks();
  renderExplore();
}

function init() {
  ensureUser(state.currentUser);
  document.body.classList.toggle("dark", state.theme === "dark");
  mountEvents();
  refreshAll();
}

init();
