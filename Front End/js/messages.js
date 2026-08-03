/* Messages — two-way conversations between farmers and botanists. */

let conversations = [];
let activeConversationId = null;
let currentUserId = null;
let pendingNewBotanist = null; // { id: "u-12", name: "..." } when arriving from Nearby Botanists with no existing thread yet

const listEl = document.getElementById("conversationList");
const threadEl = document.getElementById("threadMessages");
const composerEl = document.getElementById("threadComposer");
const replyInput = document.getElementById("replyInput");
const sendBtn = document.getElementById("sendReplyBtn");
const reviewCard = document.getElementById("reviewCard");
const reviewStars = document.getElementById("reviewStars");
const reviewComment = document.getElementById("reviewComment");
const reviewStatus = document.getElementById("reviewStatus");
const submitReviewBtn = document.getElementById("submitReviewBtn");
const reviewCancelBtn = document.getElementById("reviewCancelBtn");
let currentReviewSelection = 0;
let reviewedConversationIds = new Set();

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name) {
  return (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

async function loadConversations() {
  try {
    const data = await apiFetch("/api/consultations");
    conversations = data.conversations;
    renderList();

    // Arrived from Nearby Botanists with a specific botanist — open the
    // existing thread with them if there is one.
    if (pendingNewBotanist) {
     // const existing = conversations.find((c) => `u-${c.otherUserId}` === pendingNewBotanist.id);
     const existing = conversations.find((c) => c.otherUserId === Number(pendingNewBotanist.id));
      if (existing) {
        pendingNewBotanist = null;
        selectConversation(existing.id);
        return;
      }
    }
    if (!activeConversationId && !pendingNewBotanist && conversations.length > 0) {
      selectConversation(conversations[0].id);
    }
  } catch (err) {
    listEl.innerHTML = `<p class="text-sm text-muted" style="padding:1rem">Could not load conversations.</p>`;
  }
}

function renderList() {
  if (conversations.length === 0 && !pendingNewBotanist) {
    listEl.innerHTML = `<p class="text-sm text-muted" style="padding:1rem">No conversations yet.</p>`;
    return;
  }

  listEl.innerHTML = "";

  // If we're mid-way through starting a brand new conversation, show it
  // as a temporary entry at the top so the UI doesn't feel empty.
  if (pendingNewBotanist) {
    const draft = document.createElement("div");
    draft.className = "conversation-item active";
    draft.innerHTML = `
      <span class="avatar">${initials(pendingNewBotanist.name)}</span>
      <div style="flex:1;min-width:0">
        <div class="name-row"><strong>${pendingNewBotanist.name}</strong></div>
        <div class="preview">New conversation</div>
      </div>
    `;
    listEl.appendChild(draft);
  }

  conversations.forEach((c) => {
    const item = document.createElement("div");
    item.className = "conversation-item" + (c.id === activeConversationId ? " active" : "");
    const unread = c.status === "new" && !c.lastMessageFromMe;
    item.innerHTML = `
      <span class="avatar">${initials(c.otherUserName)}</span>
      <div style="flex:1;min-width:0">
        <div class="name-row">
          <strong>${c.otherUserName}</strong>
          <span class="text-xs text-muted">${timeAgo(c.lastMessageAt)}</span>
        </div>
        <div class="preview">${c.lastMessageFromMe ? "You: " : ""}${c.lastMessagePreview || ""}</div>
      </div>
      ${unread ? '<span class="badge badge-green text-xs">New</span>' : ""}
    `;
    item.addEventListener("click", () => selectConversation(c.id));
    listEl.appendChild(item);
  });
}

async function selectConversation(id) {
  activeConversationId = id;
  pendingNewBotanist = null;
  renderList();
  composerEl.classList.remove("hidden");

  try {
    const data = await apiFetch(`/api/consultations/${id}/messages`);
    renderThread(data.messages, data.consultation?.canReview);
  } catch (err) {
    threadEl.innerHTML = `<div class="empty-thread">Could not load this conversation.</div>`;
  }
}

function renderThread(messages, canReview = false) {
  threadEl.innerHTML = "";
  messages.forEach((m) => {
    const mine = m.senderId === currentUserId;
    const bubble = document.createElement("div");
    bubble.className = "bubble " + (mine ? "mine" : "theirs");
    bubble.innerHTML = `${escapeHtml(m.body)}<div class="bubble-time">${timeAgo(m.createdAt)}</div>`;
    threadEl.appendChild(bubble);
  });
  threadEl.scrollTop = threadEl.scrollHeight;
  toggleReviewCard(messages, canReview);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function resetReviewForm() {
  currentReviewSelection = 0;
  reviewComment.value = "";
  reviewStatus.textContent = "";
  reviewStatus.className = "text-sm mt-2";
  reviewStars?.querySelectorAll(".star-btn").forEach((btn) => btn.classList.remove("active"));
}

function setReviewSelection(value) {
  currentReviewSelection = value;
  reviewStars?.querySelectorAll(".star-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.rating) <= value);
  });
}

function toggleReviewCard(messages, canReview) {
  if (!reviewCard) return;
  const hasBotanistReply = Array.isArray(messages) && messages.some((m) => m.senderId !== currentUserId);
  const shouldShow = Boolean(activeConversationId) && Boolean(canReview) && hasBotanistReply && !reviewedConversationIds.has(activeConversationId);
  reviewCard.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) {
    resetReviewForm();
    return;
  }
  reviewStatus.textContent = "Pick a star rating for the botanist and share a short note if you want.";
  reviewStatus.className = "text-sm mt-2 text-muted";
}

async function submitReview() {
  if (!activeConversationId || currentReviewSelection < 1) {
    reviewStatus.textContent = "Please choose a rating before submitting.";
    reviewStatus.className = "text-sm mt-2 text-danger";
    return;
  }

  try {
    const data = await apiFetch(`/api/consultations/${activeConversationId}/review`, {
      method: "POST",
      body: {
        rating: currentReviewSelection,
        comment: reviewComment.value.trim() || null,
      },
    });
    reviewedConversationIds.add(activeConversationId);
    reviewStatus.textContent = data.message || "Thanks for your review.";
    reviewStatus.className = "text-sm mt-2 text-success";
    reviewCard.classList.add("hidden");
    resetReviewForm();
  } catch (err) {
    reviewStatus.textContent = err.message || "Could not submit your review.";
    reviewStatus.className = "text-sm mt-2 text-danger";
  }
}

async function sendReply() {
  const body = replyInput.value.trim();
  if (!body) return;

  sendBtn.disabled = true;
  try {
    if (pendingNewBotanist) {
      // First message of a brand new conversation.
      const data = await apiFetch("/api/consultations", {
        method: "POST",
        body: { botanistId: pendingNewBotanist.id, message: body },
      });
      pendingNewBotanist = null;
      replyInput.value = "";
      activeConversationId = data.consultation.id;
      await loadConversations();
      await selectConversation(activeConversationId);
    } else if (activeConversationId) {
      await apiFetch(`/api/consultations/${activeConversationId}/messages`, {
        method: "POST",
        body: { body },
      });
      replyInput.value = "";
      const data = await apiFetch(`/api/consultations/${activeConversationId}/messages`);
      renderThread(data.messages, data.consultation?.canReview);
      loadConversations(); // refresh preview/ordering in the list
    }
  } catch (err) {
    alert(err.message || "Could not send message.");
  } finally {
    sendBtn.disabled = false;
  }
}

function startPendingConversation(botanistId, botanistName) {
  pendingNewBotanist = { id: botanistId, name: decodeURIComponent(botanistName || "Botanist") };
  activeConversationId = null;
  composerEl.classList.remove("hidden");
  threadEl.innerHTML = `<div class="empty-thread">Send a message to start your conversation with ${pendingNewBotanist.name}.</div>`;
  renderList();
}

reviewStars?.querySelectorAll(".star-btn").forEach((btn) => {
  btn.addEventListener("click", () => setReviewSelection(Number(btn.dataset.rating)));
});
submitReviewBtn?.addEventListener("click", submitReview);
reviewCancelBtn?.addEventListener("click", () => {
  reviewCard?.classList.add("hidden");
  resetReviewForm();
});
sendBtn.addEventListener("click", sendReply);
replyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendReply();
  }
});

(function init() {
  const user = Auth.getUser();
  currentUserId = user?.id;

  const params = new URLSearchParams(window.location.search);
  const botanistParam = params.get("botanist");
  const nameParam = params.get("name");

  loadConversations().then(() => {
    if (botanistParam && !activeConversationId) {
     // const existing = conversations.find((c) => `u-${c.otherUserId}` === botanistParam);
     const existing = conversations.find((c) => c.otherUserId === Number(botanistParam));
      if (existing) {
        selectConversation(existing.id);
      } else {
        startPendingConversation(botanistParam, nameParam);
      }
    }
  });

  // Light polling so replies show up without a manual refresh.
  setInterval(() => {
    if (activeConversationId) {
      apiFetch(`/api/consultations/${activeConversationId}/messages`)
        .then((data) => renderThread(data.messages))
        .catch(() => {});
    }
    loadConversations();
  }, 6000);
})();