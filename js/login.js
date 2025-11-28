
// 이메일 유효성 검사
function validateEmail(value) {
  if (!value || value.trim().length === 0) {
    return { ok: false, msg: "이메일을 입력하세요" };
  }

  if (value.length < 5) {
    return { ok: false, msg: "이메일 형식이 너무 짧습니다" };
  }

  // 간단한 이메일 형식 체크 (예: test@test.com)
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(value)) {
    return {
      ok: false,
      msg: "올바른 이메일 주소 형식을 입력하세요 (예: example@example.com)",
    };
  }

  return { ok: true, msg: "" };
}

// 비밀번호 유효성 검사 (Figma 제약조건 반영)
// - 8~20자
// - 대문자/소문자/숫자/특수문자 각 1개 이상
function validatePassword(value) {
  if (!value || value.trim().length === 0) {
    return { ok: false, msg: "비밀번호를 입력하세요" };
  }

  if (value.length < 8 || value.length > 20) {
    return { ok: false, msg: "비밀번호는 8자 이상, 20자 이하여야 합니다" };
  }

  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
    return {
      ok: false,
      msg: "대문자·소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다",
    };
  }

  return { ok: true, msg: "" };
}

// =============================
// 2) DOM 로딩 후 초기화
// =============================
window.addEventListener("DOMContentLoaded", () => {
  // ---- DOM 요소 가져오기 ----
  const form = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const pwInput = document.getElementById("password");

  const emailError = document.getElementById("email-error");
  const pwHelper = document.getElementById("password-helper");
  const pwError = document.getElementById("password-error");

  const loginButton = document.getElementById("login-button");
  const signupButton = document.getElementById("signup-button");

  function updateValidation() {
  const emailVal = emailInput.value;
  const pwVal = pwInput.value;

  const emailResult = validateEmail(emailVal);
  const pwResult = validatePassword(pwVal);

  // ===== 이메일 에러 표시 =====
  if (!emailResult.ok && emailVal.length > 0) {
    emailError.style.display = "block";
    emailError.textContent = emailResult.msg;
  } else {
    emailError.style.display = "none";
    emailError.textContent = "";
  }

  // ===== 비밀번호 영역 처리 =====

  // 1) 처음 아무것도 입력 안 한 경우 → helper/error 모두 숨김
  if (pwVal.length === 0) {
    pwHelper.style.display = "none";   // helper 숨김
    pwError.style.display = "none";    // error 숨김
  }
  // 2) 입력은 했는데 규칙 틀린 경우 → error에만 규칙 출력
  else if (!pwResult.ok) {
    pwHelper.style.display = "none";            // helper 숨김
    pwError.style.display = "block";            // error 표시
    pwError.textContent = pwResult.msg;         // 규칙 안내
  }
  // 3) 입력 + 규칙 모두 맞음 → helper 표시
  else {
    pwError.style.display = "none";             // error 숨김
    pwHelper.style.display = "block";           // helper 표시
  }

  // ===== 버튼 활성화 처리 =====
  const allValid = emailResult.ok && pwResult.ok;
  loginButton.disabled = !allValid;

  if (allValid) {
    loginButton.classList.add("enabled");
  } else {
    loginButton.classList.remove("enabled");
  }
}


  // ---- 입력할 때마다 유효성 체크 ----
  emailInput.addEventListener("input", updateValidation);
  pwInput.addEventListener("input", updateValidation);

  // ---- 폼 제출 시 백엔드 로그인 요청 ----
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 최종 유효성 검사
    updateValidation();
    if (loginButton.disabled) {
      // 버튼이 아직 비활성이라면 요청 보내지 않음
      return;
    }

    //input 값 가져오기
    const emailVal = emailInput.value.trim();
    const pwVal = pwInput.value;
    try {
      // 현재 백엔드 스펙:
      // POST /api/auth/login
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 세션 쿠키 포함
        body: JSON.stringify({
          email: emailVal,
          password: pwVal,
        }),
      });

      if (!res.ok) {
        alert("로그인 실패: 이메일/비밀번호를 다시 확인해주세요.");
        return;
      }

      window.location.href = "./posts.html"; // 로그인 후 게시글 목록 페이지로 이동
    } catch (err) {
      console.error(err);
      alert("로그인 중 오류가 발생했습니다.");
    }
  });

  // ---- 회원가입 버튼 (지금은 안내만) ----
  signupButton.addEventListener("click", () => {
    window.location.href = "./signup.html";
  });

  // 페이지 로딩 시 초기 상태(빈 값) 기준으로 버튼 비활성화
  updateValidation();
});
