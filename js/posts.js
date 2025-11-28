// ===== 설정 =====
const API_BASE_URL = "http://localhost:8080"; // 필요하면 포트/도메인 수정

// 페이지네이션 상태
let currentPage = 0;
const pageSize = 10;
let isLoading = false;
let isLastPage = false;
const avatarCache = new Map(); // authorId -> object URL or placeholder

// DOM 준비
window.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("posts-list");
  const loadingEl = document.getElementById("posts-loading");
  const endEl = document.getElementById("posts-end");
  const writeBtn = document.getElementById("write-post-button");

  // 헤더 프로필 + 드롭다운
  const headerProfile = document.getElementById("header-profile");
  const profileMenu = document.getElementById("profile-menu");

  initHeaderProfile(headerProfile, profileMenu, {
    editProfile: () => (window.location.href = "./edit-profile.html"),
    editPassword: () => (window.location.href = "./edit-password.html"),
    logout: handleLogout,
  });
  
  // 게시글 작성 버튼 클릭 시 
  writeBtn.addEventListener("click", () => {
    window.location.href = "./make-post.html";
  });

  // 첫 페이지 로드
  fetchNextPage();
  // 인피니트 스크롤: 맨 아래 근처로 스크롤되면 다음 페이지 로드
  window.addEventListener("scroll", () => {
    if (isLoading || isLastPage) return;

    const { scrollTop, scrollHeight, clientHeight } =
      document.documentElement;

    // 바닥에서 200px 남았을 때 다음 페이지 로드
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      fetchNextPage();
    }
  });

  async function fetchNextPage() {
    if (isLoading || isLastPage) return;
    isLoading = true;
    loadingEl.style.display = "block";

    try {
      const url =
        API_BASE_URL +
        `/api/posts?page=${currentPage}&size=${pageSize}&sort=createdAt&dir=desc`;

      const res = await fetch(url, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("서버 오류: " + res.status);
      }

      const data = await res.json();
      // data: { content: [...], page, size, totalElements, totalPages }

      if (!Array.isArray(data.content) || data.content.length === 0) {
        // 첫 페이지부터 비어 있으면
        isLastPage = true;
        endEl.style.display = "block";
        loadingEl.style.display = "none";
        return;
      }

      // 카드 렌더링
      data.content.forEach((post) => {
        const card = createPostCard(post);
        listEl.appendChild(card);
      });

      currentPage += 1;

      if (currentPage >= data.totalPages) {
        isLastPage = true;
        endEl.style.display = "block";
      }
    } catch (err) {
      console.error(err);
      alert("게시글을 불러오는 중 오류가 발생했습니다.");
    } finally {
      isLoading = false;
      loadingEl.style.display = "none";
    }
  }
});

// ===== 게시글 카드 생성 함수 =====
function createPostCard(post) {
  // 기존 유틸 재사용
  const title = truncateTitle(post.title ?? "");
  const createdAt = formatDateTime(post.createdAt);
  const likeCount = formatCount(post.likeCount ?? 0);
  const commentCount = formatCount(post.commentCount ?? 0); // 아직 없으니 0
  const viewCount = formatCount(post.viewCount ?? 0);       // 아직 없으니 0
  const avatarSrc =
    post.authorProfileImageUrl ||
    post.profileImageUrl ||
    "../image/profile-default.png";
  const authorId =
    post.authorId ??
    post.author?.id ??
    post.userId;

  // authorId 기반 임시 작성자 이름
  const authorName =
    post.authorNickname ?? "알 수 없는 작성자";

  const card = document.createElement("div");
  card.className = "post-card";

  card.innerHTML = `
  <!-- 1줄째: 제목만 -->
  <div class="post-card-top">
    <h3 class="post-card-title">${title}</h3>
  </div>

  <!-- 2줄째: 좋아요/댓글/조회수 (왼쪽) + 날짜(오른쪽) -->
  <div class="post-card-middle">
    <div class="post-card-meta">
      좋아요 ${likeCount}  댓글 ${commentCount}  조회수 ${viewCount}
    </div>
    <span class="post-card-date">${createdAt}</span>
  </div>

  <div class="post-card-divider"></div>

  <div class="post-card-bottom">
    <img class="post-card-avatar" src="${avatarSrc}" alt="${authorName} 프로필" />
    <span class="post-card-author-name">${authorName}</span>
  </div>
`;

  if (authorId) {
    const avatarImg = card.querySelector(".post-card-avatar");
    loadAuthorAvatar(authorId, avatarImg);
  }

  // 카드 클릭 시 상세 페이지 이동
  card.addEventListener("click", () => {
    window.location.href = `./post.html?postId=${post.id}`; 
  });

  return card;
}



// ===== 유틸 함수들 =====

// 제목은 최대 26자까지만 표시 (26자 초과면 잘라서 "..." 붙이기)
function truncateTitle(title) {
  const maxLen = 26;
  if (!title) return "";
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen) + "...";
}

// 날짜 포맷: yyyy-MM-dd HH:mm:ss
function formatDateTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString; // 파싱 실패 시 원본 반환

  const pad = (n) => String(n).padStart(2, "0");

  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}

// 1,000 이상일 때 k 단위 표시
// 1,000 => 1k, 12,345 => 12k, 123,456 => 123k
function formatCount(value) {
  const n = Number(value) || 0;
  if (n >= 100000) {
    return Math.floor(n / 1000) + "k"; // 100k 이상
  }
  if (n >= 10000) {
    return Math.floor(n / 1000) + "k"; // 10k 이상
  }
  if (n >= 1000) {
    return Math.floor(n / 1000) + "k"; // 1k 이상
  }
  return String(n);
}

// 작성자 프로필 이미지 로더 (authorId 기준 캐싱)
async function loadAuthorAvatar(authorId, imgEl) {
  if (!imgEl) return;
  if (avatarCache.has(authorId)) {
    imgEl.src = avatarCache.get(authorId);
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/users/${authorId}/profile-image`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      avatarCache.set(authorId, "../image/profile-default.png");
      imgEl.src = "../image/profile-default.png";
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    avatarCache.set(authorId, objectUrl);
    imgEl.src = objectUrl;
  } catch (e) {
    console.error("[posts] 작성자 프로필 이미지 로드 실패:", e);
    avatarCache.set(authorId, "../image/profile-default.png");
    imgEl.src = "../image/profile-default.png";
  }
}

// ===== 헤더 드롭다운 & 로그아웃 유틸 =====

async function loadHeaderProfileImageForElement(imgEl) {
  if (!imgEl) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/me/profile-image`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      imgEl.src = "../image/profile-default.png";
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    imgEl.src = url;
  } catch (e) {
    console.error("[header] 프로필 이미지 로드 실패:", e);
    imgEl.src = "../image/profile-default.png";
  }
}

async function loadHeaderNickname(nicknameEl) {
  if (!nicknameEl) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/me`, {
      credentials: "include",
    });

    if (!res.ok) {
      return;
    }

    const data = await res.json();
    const nickname =
      data.nickname ??
      data.data?.nickname ??
      data.user?.nickname;

    if (nickname) {
      nicknameEl.textContent = nickname;
    }
  } catch (e) {
    console.error("[header] 닉네임 로드 실패:", e);
  }
}

function initHeaderProfile(headerProfileArea, menuEl, handlers) {
  if (!headerProfileArea || !menuEl) return;

  const avatarEl = headerProfileArea.querySelector(".top-header-logo");
  const nicknameEl = headerProfileArea.querySelector(".top-header-nickname");

  // 아이콘에 프로필 이미지 로드
  loadHeaderProfileImageForElement(avatarEl);
  loadHeaderNickname(nicknameEl);

  function closeMenu() {
    menuEl.classList.remove("open");
    document.removeEventListener("click", onDocumentClick);
  }

  function onDocumentClick(e) {
    if (!menuEl.contains(e.target) && !headerProfileArea.contains(e.target)) {
      closeMenu();
    }
  }

  headerProfileArea.addEventListener("click", (e) => {
    e.stopPropagation();
    const opened = menuEl.classList.toggle("open");
    if (opened) {
      document.addEventListener("click", onDocumentClick);
    } else {
      document.removeEventListener("click", onDocumentClick);
    }
  });

  const menuEditProfile = document.getElementById("menu-edit-profile");
  const menuEditPassword = document.getElementById("menu-edit-password");
  const menuLogout = document.getElementById("menu-logout");

  if (menuEditProfile) {
    menuEditProfile.addEventListener("click", () => {
      closeMenu();
      handlers.editProfile?.();
    });
  }
  if (menuEditPassword) {
    menuEditPassword.addEventListener("click", () => {
      closeMenu();
      handlers.editPassword?.();
    });
  }
  if (menuLogout) {
    menuLogout.addEventListener("click", () => {
      closeMenu();
      handlers.logout?.();
    });
  }
}

async function handleLogout() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {
    console.error("[logout] error:", e);
  } finally {
    window.location.href = "./login.html";
  }
}
