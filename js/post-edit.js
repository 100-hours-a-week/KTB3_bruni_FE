const API_BASE_URL = "http://localhost:8080";

window.addEventListener("DOMContentLoaded", () => {
  console.log("[post-edit] script loaded");

  // 1) URL에서 postId 가져오기
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("postId");
  if (!postId) {
    alert("잘못된 접근입니다. 게시글 ID가 없습니다.");
    window.location.href = "./posts.html";
    return;
  }

  // 2) DOM 요소 참조
  const backButton = document.getElementById("back-button");
  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const titleHelper = document.getElementById("title-helper");
  const contentHelper = document.getElementById("content-helper");
  const updateButton = document.getElementById("submit-button");

  // 이미지 관련 요소 (선택 사항이므로 필수 체크에는 포함 X)
  const imageInput      = document.getElementById("image");
  const imageClickArea  = document.getElementById("image-click-area");
  const imageSelectBtn  = document.querySelector(".image-select-button");
  const imageFilenameEl = document.getElementById("image-filename");
  if (!backButton || !titleInput || !contentInput || !updateButton) {
    console.error("[post-edit] 필요한 DOM 요소를 찾지 못했습니다.");
    return;
  }

  // ===== 이미지 선택 UI 동작 =====
  if (imageSelectBtn && imageInput) {
    // 버튼 클릭 시 파일 선택
    imageSelectBtn.addEventListener("click", (e) => {
      e.preventDefault();
      imageInput.click();
    });
  }

  if (imageInput && imageFilenameEl) {
    // 파일 선택 후 파일명 표시
    imageInput.addEventListener("change", () => {
      if (imageInput.files && imageInput.files.length > 0) {
        imageFilenameEl.textContent = imageInput.files[0].name;
      } else {
        imageFilenameEl.textContent = "파일을 선택해주세요.";
      }
    });
  }

  // 헤더 프로필 이미지 로드
  loadHeaderProfileImage();

  // 3) 뒤로가기 버튼
  backButton.addEventListener("click", () => {
    window.location.href = `./post.html?postId=${postId}`;
  });

  // 4) 기존 게시글 데이터 불러오기
  loadPost();

  async function loadPost() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("[post-edit] get error:", res.status);
        alert("게시글을 불러오는 중 오류가 발생했습니다.");
        window.location.href = "./posts.html";
        return;
      }

      const data = await res.json();
      titleInput.value = data.title ?? "";
      contentInput.value = data.content ?? "";

      validateForm();
    } catch (err) {
      console.error(err);
      alert("게시글을 불러오는 중 오류가 발생했습니다.");
      window.location.href = "./posts.html";
    }
  }

  // 5) 입력 변화 감지 → 버튼 활성/비활성
  titleInput.addEventListener("input", validateForm);
  contentInput.addEventListener("input", validateForm);

  function validateForm() {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    // 제목 검증
    if (!title) {
      titleHelper.textContent = "* 제목을 입력해주세요. (최대 26자)";
    } else if (title.length > 26) {
      titleHelper.textContent = "* 제목은 최대 26자까지 작성 가능합니다.";
    } else {
      titleHelper.textContent = "";
    }

    // 내용 검증
    if (!content) {
      contentHelper.textContent = "* 내용을 입력해주세요.";
    } else {
      contentHelper.textContent = "";
    }

    const valid = title.length > 0 && title.length <= 26 && content.length > 0;

    updateButton.disabled = !valid;
    if (valid) {
      updateButton.classList.add("enabled");   // 7F6AEE
    } else {
      updateButton.classList.remove("enabled"); // ACA0EB
    }
  }

  // 6) 수정 완료 버튼 → PATCH 요청
  updateButton.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    if (!title || !content) {
      alert("제목과 내용을 모두 작성해주세요.");
      return;
    }

    try {
      const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);

    // 새 이미지가 선택돼 있다면 같이 보냄
    if (imageInput && imageInput.files && imageInput.files.length > 0) {
      formData.append("image", imageInput.files[0]);  // PostUpdateReq.image
    }

    const res = await fetch(`${API_BASE_URL}/api/posts/${postId}`, {
      method: "PATCH",
      credentials: "include",
      body: formData,              // ★ JSON 아님, FormData
      // headers에 Content-Type 직접 넣지 말 것!
    });

    if (res.status === 401) {
      alert("로그인이 필요합니다.");
      window.location.href = "./login.html";
      return;
    }

    if (!res.ok) {
      console.error("[post-edit] update error:", res.status);
      alert("게시글 수정에 실패했습니다.");
      return;
    }

    alert("게시글이 수정되었습니다.");
    window.location.href = `./post.html?postId=${postId}`;
  } catch (err) {
    console.error(err);
    alert("게시글 수정 중 오류가 발생했습니다.");
  }
  });
});

// ===== 공통: 헤더 프로필 이미지 =====
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
