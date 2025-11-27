// /js/make-post.js
const API_BASE_URL = "http://localhost:8080";

window.addEventListener("DOMContentLoaded", () => {
  console.log("[make-post] script loaded");

  const backButton = document.getElementById("back-button");
  const titleInput = document.getElementById("title");
  const contentInput = document.getElementById("content");
  const imageInput = document.getElementById("image");
  const imageClickArea = document.getElementById("image-click-area");
  const imageFilename = document.getElementById("image-filename");

  const titleHelper = document.getElementById("title-helper");
  const contentHelper = document.getElementById("content-helper");
  const formHelper = document.getElementById("form-helper");
  const submitButton = document.getElementById("submit-button");
  const form = document.getElementById("write-form"); // 폼 id를 write-form으로 썼다고 가정

  // 필수 요소 체크
  if (
    !backButton || !titleInput || !contentInput || !submitButton ||
    !form || !titleHelper || !contentHelper || !formHelper
  ) {
    console.error("[make-post] 필요한 DOM 요소를 찾지 못했습니다.");
    return;
  }

  // 뒤로가기 → 게시글 목록으로 이동
  backButton.addEventListener("click", () => {
    window.location.href = "./posts.html";
  });

  // 헤더 프로필 이미지 로드
  loadHeaderProfileImage();

  // ===== 이미지 선택 영역 =====
  if (imageClickArea && imageInput) {
    // 영역/버튼 클릭 시 파일 선택창 열기
    imageClickArea.addEventListener("click", () => {
      imageInput.click();
    });

    imageInput.addEventListener("change", () => {
      const file = imageInput.files[0];
      if (file) {
        imageFilename.textContent = file.name;
      } else {
        imageFilename.textContent = "파일을 선택해주세요.";
      }
    });
  }

  // ===== 제목/내용 입력 시 유효성 검사 =====
  titleInput.addEventListener("input", validateForm);
  contentInput.addEventListener("input", validateForm);

  // 초기 상태 한 번 계산
  validateForm();

  // ===== 폼 제출 =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    // 제목/내용 비었을 때 → helper text (피그마 정책)
    if (!title || !content) {
      setError(formHelper, "* 제목, 내용을 모두 작성해주세요.");
      if (!title) setError(titleHelper, "* 제목을 입력해주세요.");
      if (!content) setError(contentHelper, "* 내용을 입력해주세요.");
      return;
    }

    // 방어용: 제목 길이 다시 체크 (프론트/백엔드 모두에서 검증)
    if (title.length > 26) {
      setError(titleHelper, "* 제목은 최대 26자까지 입력 가능합니다.");
      return;
    }

    clearError(formHelper);

    const file = imageInput && imageInput.files[0];

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      if (file) {
        // 🔹 PostCreateRequest의 MultipartFile 필드명과 동일해야 함 (image)
        formData.append("image", file);
      }

      const res = await fetch(`${API_BASE_URL}/api/posts`, {
        method: "POST",
        credentials: "include", // 세션 쿠키 포함
        body: formData,         // multipart/form-data
      });

      if (res.status === 401) {
        alert("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
        window.location.href = "./login.html";
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("[make-post] create error:", res.status, text);
        alert("게시글 작성에 실패했습니다.");
        return;
      }

      alert("게시글이 작성되었습니다.");
      window.location.href = "./posts.html";
    } catch (err) {
      console.error(err);
      alert("게시글 작성 중 오류가 발생했습니다.");
    }
  });

  // ===== 내부 함수들 =====

  function validateForm() {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();

    // 제목 길이 체크 (입력 단계 피드백)
    if (title.length > 26) {
      setError(titleHelper, "* 제목은 최대 26자까지 입력 가능합니다.");
    } else {
      clearError(titleHelper);
    }

    // 내용은 비어있으면 제출 시 따로 메시지 표시하므로 여기서는 버튼 활성화만
    const valid = !!(title && content && title.length <= 26);

    submitButton.disabled = !valid;
    if (valid) {
      submitButton.classList.add("enabled");   // 색상 #7F6AEE
    } else {
      submitButton.classList.remove("enabled"); // 색상 #ACA0EB
    }
  }

  function setError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.add("error");
  }

  function clearError(el) {
    if (!el) return;
    el.textContent = "";
    el.classList.remove("error");
  }
});

// ===== 헤더 프로필 이미지 로딩 (posts.js와 동일 패턴) =====
async function loadHeaderProfileImage() {
  const headerProfileImg = document.querySelector(".top-header-logo");
  if (!headerProfileImg) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/users/me/profile-image`, {
      method: "GET",
      credentials: "include",
    });

    // 로그인 안 됐거나(401), 이미지가 없거나(404) → 기본 아이콘 사용
    if (!res.ok) {
      headerProfileImg.src = "./header-icon.png";
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    headerProfileImg.src = objectUrl;
  } catch (e) {
    console.error("[header] 프로필 이미지 로드 실패:", e);
    headerProfileImg.src = "./header-icon.png";
  }
}
