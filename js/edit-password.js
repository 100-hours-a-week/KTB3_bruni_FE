const API_BASE_URL = "http://localhost:8080";

window.addEventListener("DOMContentLoaded", () => {
  console.log("[edit-password] script loaded");

  const backButton = document.getElementById("back-button");
  const headerProfile = document.getElementById("header-profile");
  const profileMenu = document.getElementById("profile-menu");

  const passwordInput = document.getElementById("password");
  const passwordConfirmInput = document.getElementById("password-confirm");
  const passwordHelper = document.getElementById("password-helper");
  const passwordConfirmHelper = document.getElementById("password-confirm-helper");
  const formHelper = document.getElementById("form-helper");
  const updateButton = document.getElementById("update-password-button");

  if (
    !backButton || !headerProfile || !profileMenu ||
    !passwordInput || !passwordConfirmInput || !updateButton
  ) {
    console.error("[edit-password] 필요한 DOM 요소를 찾지 못했습니다.");
    return;
  }

  // 헤더 공통 초기화
  initHeaderProfile(headerProfile, profileMenu, {
    editProfile: () => window.location.href = "./edit-profile.html",
    editPassword: () => window.location.href = "./edit-password.html",
    logout: handleLogout,
  });

  backButton.addEventListener("click", () => {
    window.location.href = "./posts.html";
  });

  // 입력 변경 시 유효성 검사
  passwordInput.addEventListener("input", validateForm);
  passwordConfirmInput.addEventListener("input", validateForm);

  function validateForm() {
    const pw = passwordInput.value;
    const pwc = passwordConfirmInput.value;

    formHelper.textContent = "";

    // 비밀번호
    if (!pw) {
      setError(passwordHelper, "*비밀번호를 입력해주세요.");
    } else if (!isValidPassword(pw)) {
      setError(
        passwordHelper,
        "*비밀번호 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다."
      );
    } else {
      clearError(passwordHelper);
    }

    // 비밀번호 확인
    if (!pwc) {
      setError(passwordConfirmHelper, "*비밀번호를 한번 더 입력해주세요.");
    } else if (pw && pw !== pwc) {
      setError(passwordConfirmHelper, "*비밀번호와 다릅니다.");
    } else {
      clearError(passwordConfirmHelper);
    }

    const valid =
      pw &&
      isValidPassword(pw) &&
      pwc &&
      pw === pwc;

    updateButton.disabled = !valid;
    if (valid) {
      updateButton.classList.add("enabled");
    } else {
      updateButton.classList.remove("enabled");
    }
  }

  function setError(el, msg) {
    el.textContent = msg;
    el.classList.add("error");
  }

  function clearError(el) {
    el.textContent = "";
    el.classList.remove("error");
  }

  function isValidPassword(pw) {
    if (pw.length < 8 || pw.length > 20) return false;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    return hasUpper && hasLower && hasDigit && hasSpecial;
  }

  // 수정하기 클릭 → PATCH /api/users/me/password
  updateButton.addEventListener("click", async () => {
    const pw = passwordInput.value;
    const pwc = passwordConfirmInput.value;

    validateForm();
    if (updateButton.disabled) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          password: pw,
          passwordConfirm: pwc,
        }),
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
        } catch (e) { /* ignore */ }

        console.error("[edit-password] update error:", res.status, error);
        formHelper.textContent =
          (error && error.message) ||
          "비밀번호 수정에 실패했습니다.";
        formHelper.classList.add("error");
        return;
      }

      passwordInput.value = "";
      passwordConfirmInput.value = "";
      validateForm();
      showToast("수정 완료");
    } catch (err) {
      console.error(err);
      alert("비밀번호 수정 중 오류가 발생했습니다.");
    }
  });
});

/* ===== 헤더/토스트 유틸 (edit-profile.js와 동일한 버전) ===== */

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
