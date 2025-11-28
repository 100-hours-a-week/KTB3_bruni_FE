
window.addEventListener("DOMContentLoaded", () => {
  console.log("[edit-profile] script loaded");

  // DOM 요소
  const backButton = document.getElementById("back-button");
  const headerProfile = document.getElementById("header-profile");
  const profileMenu = document.getElementById("profile-menu");
  const menuEditProfile = document.getElementById("menu-edit-profile");
  const menuEditPassword = document.getElementById("menu-edit-password");
  const menuLogout = document.getElementById("menu-logout");

  const profileCircle = document.getElementById("profile-circle");
  const profileInput = document.getElementById("profile-input");

  const emailInput = document.getElementById("email");
  const nicknameInput = document.getElementById("nickname");
  const nicknameHelper = document.getElementById("nickname-helper");

  const updateButton = document.getElementById("update-profile-button");
  const deleteButton = document.getElementById("delete-account-button");

  const modalOverlay = document.getElementById("confirm-modal-overlay");
  const modalCancelBtn = document.getElementById("modal-cancel");
  const modalConfirmBtn = document.getElementById("modal-confirm");

  let selectedProfileFile = null;
  if (
    !backButton || !headerProfile || !profileMenu ||
    !emailInput || !nicknameInput || !updateButton || !deleteButton
  ) {
    console.error("[edit-profile] 필요한 DOM 요소를 찾지 못했습니다.");
    return;
  }

  // 헤더 프로필 이미지 로드 + 드롭다운 초기화
  initHeaderProfile(headerProfile, profileMenu, {
    editProfile: () => window.location.href = "./edit-profile.html",
    editPassword: () => window.location.href = "./edit-password.html",
    logout: handleLogout,
  });

  // 뒤로가기: 게시글 목록으로
  backButton.addEventListener("click", () => {
    window.location.href = "./posts.html";
  });

  // 프로필 동그라미 클릭 → 파일 선택 (지금은 프리뷰만, 서버 업로드는 추후)
  if (profileCircle && profileInput) {
    profileCircle.addEventListener("click", () => {
      profileInput.click();
    });

    profileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      selectedProfileFile = file;
      const reader = new FileReader();
      reader.onload = (ev) => {
        profileCircle.style.backgroundImage = `url(${ev.target.result})`;
        profileCircle.style.backgroundSize = "cover";
        profileCircle.style.backgroundPosition = "center";
      };
      reader.readAsDataURL(file);

      // TODO: 서버에 프로필 이미지 업로드 API 만들면 여기서 PATCH 호출
    });
  }

  // 내 정보 불러오기
  loadMyProfile();

  async function loadMyProfile() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        credentials: "include",
      });

      if (res.status === 401) {
        alert("로그인이 필요합니다.");
        window.location.href = "./login.html";
        return;
      }

      if (!res.ok) {
        console.error("[edit-profile] /me error:", res.status);
        alert("회원 정보를 불러오는 중 오류가 발생했습니다.");
        return;
      }

      const data = await res.json();
      emailInput.value = data.email ?? "";
      nicknameInput.value = data.nickname ?? "";

      // 프로필 원에도 이미지 로드
      loadProfileCircleImage();

      validateNickname();
    } catch (err) {
      console.error(err);
      alert("회원 정보를 불러오는 중 오류가 발생했습니다.");
    }
  }

  async function loadProfileCircleImage() {
    if (!profileCircle) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me/profile-image`, {
        method: "GET",
        credentials: "include",
      });

      if (!res.ok) {
        return; // 이미지 없으면 기본 회색 유지
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      profileCircle.style.backgroundImage = `url(${url})`;
      profileCircle.style.backgroundSize = "cover";
      profileCircle.style.backgroundPosition = "center";
    } catch (e) {
      console.error("[edit-profile] 프로필 이미지 로드 실패:", e);
    }
  }

  // 닉네임 입력 이벤트
  nicknameInput.addEventListener("input", validateNickname);

  function validateNickname() {
    const nickname = nicknameInput.value.trim();

    if (!nickname) {
      setNicknameError("*닉네임을 입력해주세요.");
    } else if (nickname.length > 10) {
      setNicknameError("*닉네임은 최대 10자까지 작성 가능합니다.");
    } else {
      clearNicknameError();
    }

    const valid = nickname.length > 0 && nickname.length <= 10;
    updateButton.disabled = !valid;
    if (valid) {
      updateButton.classList.add("enabled");
    } else {
      updateButton.classList.remove("enabled");
    }
  }

  function setNicknameError(msg) {
    nicknameHelper.textContent = msg;
    nicknameHelper.classList.add("error");
  }

  function clearNicknameError() {
    nicknameHelper.textContent = "";
    nicknameHelper.classList.remove("error");
  }

  // 수정하기 버튼
  updateButton.addEventListener("click", async () => {
    const nickname = nicknameInput.value.trim();

    if (!nickname || nickname.length > 10) {
      validateNickname();
      return;
    }

    try {
      const formData = new FormData();
      formData.append("nickname", nickname);

        if (selectedProfileFile) {
        formData.append("profileImage", selectedProfileFile);
        }

        const res = await fetch(`${API_BASE_URL}/api/users/me/profile`, {
        method: "PATCH",
        credentials: "include",
        body: formData,
});


      if (res.status === 401) {
        alert("로그인이 필요합니다.");
        window.location.href = "./login.html";
        return;
      }

      if (!res.ok) {
        let error;
        try {
          error = await res.json();
        } catch (e) {
          /* ignore */
        }

        // 닉네임 중복 등
        if (res.status === 400) {
          setNicknameError("*중복된 닉네임 입니다.");
          return;
        }

        console.error("[edit-profile] update error:", res.status, error);
        alert("회원 정보 수정에 실패했습니다.");
        return;
      }

      showToast("수정 완료");
    } catch (err) {
      console.error(err);
      alert("회원 정보 수정 중 오류가 발생했습니다.");
    }
  });

  // 회원 탈퇴 버튼
  deleteButton.addEventListener("click", () => {
    openConfirmModal();
  });

  modalCancelBtn.addEventListener("click", closeConfirmModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeConfirmModal();
  });

  modalConfirmBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.status === 401) {
        alert("로그인이 필요합니다.");
        window.location.href = "./login.html";
        return;
      }

      if (!res.ok) {
        console.error("[edit-profile] delete error:", res.status);
        alert("회원 탈퇴에 실패했습니다.");
        closeConfirmModal();
        return;
      }

      closeConfirmModal();
      alert("회원 탈퇴가 완료되었습니다.");
      window.location.href = "./login.html";
    } catch (err) {
      console.error(err);
      alert("회원 탈퇴 중 오류가 발생했습니다.");
      closeConfirmModal();
    }
  });

  function openConfirmModal() {
    modalOverlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeConfirmModal() {
    modalOverlay.classList.remove("open");
    document.body.style.overflow = "";
  }
});

/* ===== 공통 헤더 & 토스트 유틸 ===== */

async function loadHeaderProfileImageForElement(imgEl) {
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

function initHeaderProfile(headerProfile, menuEl, handlers) {
  if (!headerProfile) return;

  loadHeaderProfileImageForElement(headerProfile);

  function closeMenu() {
    menuEl.classList.remove("open");
    document.removeEventListener("click", onDocumentClick);
  }

  function onDocumentClick(e) {
    if (!menuEl.contains(e.target) && e.target !== headerProfile) {
      closeMenu();
    }
  }

  headerProfile.addEventListener("click", (e) => {
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

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}
