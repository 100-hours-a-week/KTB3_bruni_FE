const API_BASE_URL = "http://localhost:8080";

window.addEventListener("DOMContentLoaded", () => {
  console.log("[post] script loaded");

  // ----- postId 가져오기 -----
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("postId");
  if (!postId) {
    alert("잘못된 접근입니다. 게시글 ID가 없습니다.");
    window.location.href = "./posts.html";
    return;
  }

  // ----- 엘리먼트 참조 -----
  const backButton = document.getElementById("back-button");
  const titleEl = document.getElementById("post-title");
  const authorEl = document.getElementById("post-author");
  const dateEl = document.getElementById("post-date");
  const contentEl = document.getElementById("post-content");
  const imageWrapperEl = document.getElementById("post-image-wrapper");
  const imageEl = document.getElementById("post-image");

  const likeButton = document.getElementById("like-button");
  const likeCountEl = document.getElementById("like-count");
  const viewCountEl = document.getElementById("view-count");
  const commentCountEl = document.getElementById("comment-count");

  const commentInput = document.getElementById("comment-input");
  const commentHelper = document.getElementById("comment-helper");
  const commentSubmitButton = document.getElementById("comment-submit-button");
  const commentListEl = document.getElementById("comment-list");

  const editButton = document.getElementById("post-edit-button");
  const deleteButton = document.getElementById("post-delete-button");

  const modalOverlay = document.getElementById("confirm-modal-overlay");
  const modalTitleEl = document.getElementById("modal-title");
  const modalMessageEl = document.getElementById("modal-message");
  const modalCancelBtn = document.getElementById("modal-cancel");
  const modalConfirmBtn = document.getElementById("modal-confirm");

  if (
    !backButton || !titleEl || !authorEl || !dateEl || !contentEl ||
    !likeButton || !likeCountEl || !viewCountEl || !commentCountEl ||
    !commentInput || !commentSubmitButton || !commentListEl ||
    !editButton || !deleteButton || !modalOverlay
  ) {
    console.error("[post] 필요한 DOM 요소를 찾지 못했습니다.");
    return;
  }

  // 상태
  let likeState = {
    liked: false,
    count: 0,
  };
  let currentUserId = null;
  let currentPost = null;

  let editingCommentId = null; // null이면 새 댓글, 숫자면 수정 중인 댓글 ID
  let deleteTarget = null;     // { type: "post" | "comment", id: number }

  // ----- 공통: 헤더 프로필 이미지 로드 -----
  loadHeaderProfileImage();
  setPostActionsVisible(false); // 기본 숨김

  // ----- 이벤트 바인딩 -----

  backButton.addEventListener("click", () => {
    window.location.href = "./posts.html";
  });

  // 게시글 수정 
  editButton.addEventListener("click", () => {
    window.location.href = `./post-edit.html?postId=${postId}`;
  });

  deleteButton.addEventListener("click", () => {
    openConfirmModal("post", postId);
  });

  likeButton.addEventListener("click", () => {
    toggleLike();
  });

  commentInput.addEventListener("input", updateCommentButtonState);

  commentSubmitButton.addEventListener("click", () => {
    handleCommentSubmit();
  });

  // 모달 이벤트
  modalCancelBtn.addEventListener("click", () => {
    closeConfirmModal();
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      closeConfirmModal();
    }
  });

  modalConfirmBtn.addEventListener("click", () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "post") {
      deletePost(deleteTarget.id);
    } else if (deleteTarget.type === "comment") {
      deleteComment(deleteTarget.id);
    }
  });

  // ----- 초기 데이터 로드 -----
  initPage();

  async function initPage() {
    await loadCurrentUser();
    await loadPostDetail();
    await loadPostImage();
    loadComments();
  }

  // ===============================
  //  함수들
  // ===============================

  async function loadPostDetail() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("[post] get error:", res.status);
        alert("게시글을 불러오는 중 오류가 발생했습니다.");
        window.location.href = "./posts.html";
        return;
      }

      const data = await res.json();
      renderPost(data);
    } catch (err) {
      console.error(err);
      alert("게시글을 불러오는 중 오류가 발생했습니다.");
    }
  }

  function renderPost(post) {
    currentPost = post;
    titleEl.textContent = post.title ?? "";
    authorEl.textContent = post.authorNickname ?? "알 수 없는 작성자";
    dateEl.textContent = formatDateTime(post.createdAt);

    contentEl.textContent = post.content ?? "";

    likeState.count = post.likeCount ?? 0;
    likeState.liked = !!post.liked; // PostRes에 liked 여부를 추가해두면 좋음
    updateLikeButton();

    viewCountEl.textContent = formatCount(post.viewCount ?? 0);
    // commentCount는 댓글 데이터를 불러온 뒤에 설정

    applyPostOwnership(post);
  }
  function applyPostOwnership(post) {
    const authorId =
      post.authorId ??
      post.author?.id ??
      post.userId ??
      post.authorUserId;

    const isMine =
      typeof authorId === "number" &&
      typeof currentUserId === "number" &&
      authorId === currentUserId;

    setPostActionsVisible(isMine);
  }

  // 게시글 이미지 (없으면 회색 박스 유지)
  async function loadPostImage() {
    if (!imageWrapperEl || !imageEl) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/image`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        // 404 등 → 이미지 없음
        imageWrapperEl.style.display = "none";
        return;
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      imageEl.src = objectUrl;
    } catch (err) {
      console.error("[post] 이미지 로드 실패:", err);
      imageWrapperEl.style.display = "none";
    }
  }

  // 좋아요 버튼 UI 업데이트
  function updateLikeButton() {
    likeCountEl.textContent = formatCount(likeState.count);
    if (likeState.liked) {
      likeButton.classList.add("enabled");
      likeButton.classList.remove("disabled");
    } else {
      likeButton.classList.add("disabled");
      likeButton.classList.remove("enabled");
    }
  }

  // 좋아요 토글
async function toggleLike() {
  const method = likeState.liked ? "DELETE" : "POST";

  try {
    const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
      method,
      credentials: "include",
    });

    if (res.status === 401) {
      alert("로그인이 필요합니다.");
      window.location.href = "./login.html";
      return;
    }

    if (!res.ok) {
      console.error("[post] like error:", res.status);
      alert("좋아요 처리 중 오류가 발생했습니다.");
      return;
    }

    const data = await res.json(); // { likeCount: number }
    likeState.count = data.likeCount ?? likeState.count;
    likeState.liked = !likeState.liked; // ← 이 줄이 프론트 토글

    updateLikeButton();
  } catch (err) {
    console.error(err);
    alert("좋아요 처리 중 오류가 발생했습니다.");
  }
}

async function loadCurrentUser() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const data = await res.json();
    const id =
      data.id ??
      data.userId ??
      data.user?.id ??
      data.data?.id;
    if (typeof id === "number") {
      currentUserId = id;
    }
  } catch (err) {
    console.error("[post] loadCurrentUser error", err);
  }
}

function setPostActionsVisible(show) {
  if (show) {
    editButton.style.display = "";
    deleteButton.style.display = "";
  } else {
    editButton.style.display = "none";
    deleteButton.style.display = "none";
  }
}


  // 댓글 목록 로드
  async function loadComments() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/posts/${postId}/comments`,
        { credentials: "include" }
      );

      if (!res.ok) {
        console.error("[post] comment list error:", res.status);
        return;
      }

      const comments = await res.json(); // [{id, content, authorNickname, createdAt, mine}, ...]
      renderComments(comments);
    } catch (err) {
      console.error(err);
    }
  }

  function renderComments(comments) {
    commentListEl.innerHTML = "";

    comments.forEach((c) => {
      const item = document.createElement("article");
      item.className = "comment-item";

      const header = document.createElement("div");
      header.className = "comment-header";

      const authorBlock = document.createElement("div");
      authorBlock.className = "comment-author-block";
      authorBlock.innerHTML = `
        <span class="comment-bullet">•</span>
        <span class="comment-author">${c.authorNickname ?? "익명"}</span>
        <span class="comment-date">${formatDateTime(c.createdAt)}</span>
      `;

      header.appendChild(authorBlock);

      // 내가 쓴 댓글일 때만 수정/삭제 버튼 표시 (c.mine === true)
      if (c.mine) {
        const actions = document.createElement("div");
        actions.className = "comment-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "comment-action-btn";
        editBtn.textContent = "수정";
        editBtn.addEventListener("click", () => {
          startEditComment(c);
        });

        const delBtn = document.createElement("button");
        delBtn.className = "comment-action-btn";
        delBtn.textContent = "삭제";
        delBtn.addEventListener("click", () => {
          openConfirmModal("comment", c.id);
        });

        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        header.appendChild(actions);
      }

      const content = document.createElement("p");
      content.className = "comment-content";
      content.textContent = c.content ?? "";

      item.appendChild(header);
      item.appendChild(content);
      commentListEl.appendChild(item);
    });

    // 댓글 수 갱신
    commentCountEl.textContent = formatCount(comments.length);
  }

  // 댓글 입력에 따른 버튼 활성화
  function updateCommentButtonState() {
    const text = commentInput.value.trim();
    const valid = text.length > 0;

    commentSubmitButton.disabled = !valid;
    if (valid) {
      commentSubmitButton.classList.add("enabled");
    } else {
      commentSubmitButton.classList.remove("enabled");
    }
  }

  // 댓글 등록 또는 수정
  async function handleCommentSubmit() {
    const text = commentInput.value.trim();
    if (!text) {
      commentHelper.textContent = "* 댓글 내용을 입력해주세요.";
      return;
    }
    commentHelper.textContent = "";

    try {
      if (!editingCommentId) {
        // 새 댓글 등록
        const res = await fetch(
          `${API_BASE_URL}/api/posts/${postId}/comments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ content: text }),
          }
        );

        if (res.status === 401) {
          alert("로그인이 필요합니다.");
          window.location.href = "./login.html";
          return;
        }

        if (!res.ok) {
          console.error("[post] comment create error:", res.status);
          alert("댓글 등록에 실패했습니다.");
          return;
        }
      } else {
        // 댓글 수정
        const res = await fetch(
          `${API_BASE_URL}/api/comments/${editingCommentId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ content: text }),
          }
        );

        if (!res.ok) {
          console.error("[post] comment update error:", res.status);
          alert("댓글 수정에 실패했습니다.");
          return;
        }
      }

      // 성공 시 초기화
      resetCommentForm();
      await loadComments();
    } catch (err) {
      console.error(err);
      alert("댓글 처리 중 오류가 발생했습니다.");
    }
  }

  function startEditComment(comment) {
    editingCommentId = comment.id;
    commentInput.value = comment.content ?? "";
    commentSubmitButton.textContent = "댓글 수정";
    updateCommentButtonState();
  }

  function resetCommentForm() {
    editingCommentId = null;
    commentInput.value = "";
    commentSubmitButton.textContent = "댓글 등록";
    updateCommentButtonState();
  }

  // 게시글 삭제
  async function deletePost(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.status === 401) {
        alert("로그인이 필요합니다.");
        window.location.href = "./login.html";
        return;
      }

      if (!res.ok) {
        console.error("[post] delete error:", res.status);
        alert("게시글 삭제에 실패했습니다.");
        closeConfirmModal();
        return;
      }

      closeConfirmModal();
      alert("게시글이 삭제되었습니다.");
      window.location.href = "./posts.html";
    } catch (err) {
      console.error(err);
      alert("게시글 삭제 중 오류가 발생했습니다.");
      closeConfirmModal();
    }
  }

  // 댓글 삭제
  async function deleteComment(commentId) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/comments/${commentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        console.error("[post] comment delete error:", res.status);
        alert("댓글 삭제에 실패했습니다.");
        closeConfirmModal();
        return;
      }

      closeConfirmModal();
      await loadComments();
    } catch (err) {
      console.error(err);
      alert("댓글 삭제 중 오류가 발생했습니다.");
      closeConfirmModal();
    }
  }

  // 모달 열기
  function openConfirmModal(type, id) {
    deleteTarget = { type, id };

    if (type === "post") {
      modalTitleEl.textContent = "게시글을 삭제하시겠습니까?";
      modalMessageEl.textContent = "삭제한 내용은 복구 할 수 없습니다.";
    } else if (type === "comment") {
      modalTitleEl.textContent = "댓글을 삭제하시겠습니까?";
      modalMessageEl.textContent = "삭제한 내용은 복구 할 수 없습니다.";
    }

    modalOverlay.classList.add("open");
    document.body.style.overflow = "hidden"; // 스크롤 방지
  }

  function closeConfirmModal() {
    deleteTarget = null;
    modalOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }
});

// ===== 공통 유틸 =====

// 날짜 포맷: yyyy-MM-dd HH:mm:ss
function formatDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;

  const pad = (n) => String(n).padStart(2, "0");

  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}

// 1,000 이상일 때 k 단위 표시 (게시글 목록과 동일 로직)
function formatCount(value) {
  const n = Number(value) || 0;
  if (n >= 100000) {
    return Math.floor(n / 1000) + "k";
  }
  if (n >= 10000) {
    return Math.floor(n / 1000) + "k";
  }
  if (n >= 1000) {
    return Math.floor(n / 1000) + "k";
  }
  return String(n);
}

// 헤더 프로필 이미지
async function loadHeaderProfileImage() {
  const headerProfileImg = document.querySelector(".top-header-logo");
  if (!headerProfileImg) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/users/me/profile-image`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      headerProfileImg.src = "../image/profile-default.png";
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    headerProfileImg.src = objectUrl;
  } catch (e) {
    console.error("[header] 프로필 이미지 로드 실패:", e);
    headerProfileImg.src = "../image/profile-default.png";
  }
}
