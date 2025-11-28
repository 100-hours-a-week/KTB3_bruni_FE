
window.addEventListener("DOMContentLoaded", () => {
  console.log("[signup] script loaded");

  // 요소 참조
  const backButton = document.getElementById("back-button");
  const goLoginButton = document.getElementById("go-login-button");

  const profileCircle = document.getElementById("profile-circle");
  const profileInput = document.getElementById("profile-input");
  const profileHelper = document.getElementById("profile-helper");

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const passwordConfirmInput = document.getElementById("password-confirm");
  const nicknameInput = document.getElementById("nickname");
  const signupButton = document.getElementById("signup-button");
  const signupForm = document.getElementById("signup-form");

  const emailHelper = document.getElementById("email-helper");
  const passwordHelper = document.getElementById("password-helper");
  const passwordConfirmHelper = document.getElementById("password-confirm-helper");
  const nicknameHelper = document.getElementById("nickname-helper");

  // 필수 요소 체크
  if (
    !backButton || !goLoginButton ||
    !emailInput || !passwordInput || !passwordConfirmInput || !nicknameInput ||
    !signupButton || !signupForm ||
    !emailHelper || !passwordHelper || !passwordConfirmHelper || !nicknameHelper
  ) {
    console.error("[signup] 필요한 DOM 요소를 찾지 못했습니다.");
    return;
  }

  // ===== 네비게이션 =====
  backButton.addEventListener("click", () => {
    // 항상 html 폴더 내 login.html (로그인 페이지)로
    window.location.href = "./login.html";
  });

  goLoginButton.addEventListener("click", () => {
    window.location.href = "./login.html";
  });

  // ===== 프로필 사진 미리보기 =====
  if (profileCircle && profileInput) {
    profileCircle.addEventListener("click", () => {
      profileInput.click();
    });

    profileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        profileCircle.classList.add("has-image");
        profileCircle.style.backgroundImage = `url(${e.target.result})`;
        const plus = profileCircle.querySelector(".profile-plus");
        if (plus) plus.style.display = "none";

        // 프로필 사진이 선택되면 헬퍼 텍스트 지우기
        if (profileHelper) {
            clearHelperError(profileHelper);
            }
      };
      reader.readAsDataURL(file);
    });
  }

  // ===== 입력 유효성 검사 =====
  emailInput.addEventListener("input", validateForm);
  passwordInput.addEventListener("input", validateForm);
  passwordConfirmInput.addEventListener("input", validateForm);
  nicknameInput.addEventListener("input", validateForm);

  // 초기 상태 한번 계산
  validateForm();

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isFormValid()) {
      alert("입력값을 다시 확인해주세요.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const nickname = nicknameInput.value.trim();
    const file = profileInput.files[0]; // 프로필 사진 파일 (선택 사항)

    try {
      console.log("[signup] 요청 전송", { email, nickname, hasFile: !!file });

      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("nickname", nickname);
      if (file) {
        formData.append("profileImage", file); // 필드명 : profileImage
      }

      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        body: formData, // Content-Type 헤더는 브라우저가 자동 설정
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[signup] signup error:", res.status, text);
        throw new Error("회원가입에 실패했습니다.");
      }

      alert("회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.");
      window.location.href = "./login.html";
    } catch (err) {
      console.error(err);
      alert("회원가입 중 오류가 발생했습니다.");
    }
  });

  function validateForm() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    const nickname = nicknameInput.value.trim();

    // 이메일
    if (!email) {
      clearHelperError(emailHelper);
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setHelperError(
        emailHelper,
        "* 올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)"
      );
    } else {
      clearHelperError(emailHelper);
    }

    // 비밀번호
    if (!password) {
      clearHelperError(passwordHelper);
    } else if (!isValidPassword(password)) {
      setHelperError(
        passwordHelper,
        "* 비밀번호는 8~20자, 대/소문자·숫자·특수문자를 각각 1개 이상 포함해야 합니다."
      );
    } else {
      clearHelperError(passwordHelper);
    }

    // 비밀번호 확인
    if (!passwordConfirm) {
      clearHelperError(passwordConfirmHelper);
    } else if (password !== passwordConfirm) {
      setHelperError(passwordConfirmHelper, "* 비밀번호가 다릅니다.");
    } else {
      clearHelperError(passwordConfirmHelper);
    }

    // 닉네임
    if (!nickname) {
      clearHelperError(nicknameHelper);
    } else if (/\s/.test(nickname)) {
      setHelperError(nicknameHelper, "* 닉네임에 띄어쓰기를 없애주세요.");
    } else if (nickname.length > 10) {
      setHelperError(
        nicknameHelper,
        "* 닉네임은 최대 10자까지 작성 가능합니다."
      );
    } else {
      clearHelperError(nicknameHelper);
    }

    // 버튼 활성/비활성
    if (isFormValid()) {
      signupButton.disabled = false;
      signupButton.classList.add("enabled");
    } else {
      signupButton.disabled = true;
      signupButton.classList.remove("enabled");
    }
  }

  function isFormValid() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    const nickname = nicknameInput.value.trim();

    const emailValid =
      email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const pwValid = password && isValidPassword(password);
    const pwConfirmValid = passwordConfirm && password === passwordConfirm;
    const nicknameValid =
      nickname && !/\s/.test(nickname) && nickname.length <= 10;

    return emailValid && pwValid && pwConfirmValid && nicknameValid;
  }

  function isValidPassword(pw) {
    if (pw.length < 8 || pw.length > 20) return false;
    const hasUpper = /[A-Z]/.test(pw);
    const hasLower = /[a-z]/.test(pw);
    const hasDigit = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    return hasUpper && hasLower && hasDigit && hasSpecial;
  }

  function setHelperError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add("error");
    el.style.display = "block";
  }

  // ✅ 유효하면 helper text를 완전히 지움
  function clearHelperError(el) {
    if (!el) return;
    el.textContent = "";
    el.classList.remove("error");
    el.style.display = "none";
  }
});
