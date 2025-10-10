document.addEventListener('DOMContentLoaded', function () {
  let isOtpVerified = false;
  const form = document.getElementById('registerForm');
  const toggle = document.getElementById('togglePassword');
  const passwordField = document.getElementById('password');
  const confirmPasswordField = document.getElementById('confirmPassword');

  // Toggle password visibility
  if (toggle) {
    toggle.addEventListener('change', function () {
      const type = this.checked ? 'text' : 'password';
      passwordField.type = type;
      if (confirmPasswordField) {
        confirmPasswordField.type = type;
      }
    });
  }

  // Form submission
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      // Reset error messages
      document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

      // Get form data
      const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        mobile: document.getElementById('mobile').value.trim(),
        city: document.getElementById('city').value,
        password: passwordField.value
      };

      // Client-side validation
      let isValid = true;

      // Validate name
      if (!formData.name) {
        showError('nameError', 'Name is required');
        isValid = false;
      } else if (formData.name.length < 2 || formData.name.length > 50) {
        showError('nameError', 'Name must be between 2 and 50 characters');
        isValid = false;
      }

      // Validate email
      if (!formData.email) {
        showError('emailError', 'Email is required');
        isValid = false;
      } else if (!isValidEmail(formData.email)) {
        showError('emailError', 'Please enter a valid email address');
        isValid = false;
      }

      // Validate mobile
      if (!formData.mobile) {
        showError('mobileError', 'Mobile number is required');
        isValid = false;
      } else if (!/^[6-9]\d{9}$/.test(formData.mobile)) {
        showError('mobileError', 'Please enter a valid 10-digit mobile number');
        isValid = false;
      }

      // Validate city
      if (!formData.city) {
        showError('cityError', 'Please select your city');
        isValid = false;
      }

      // Validate password
      if (!formData.password) {
        showError('passwordError', 'Password is required');
        isValid = false;
      } else if (formData.password.length < 6) {
        showError('passwordError', 'Password must be at least 6 characters long');
        isValid = false;
      }

      // Validate confirm password
      const confirmPassword = confirmPasswordField.value;
      if (!confirmPassword) {
        showError('confirmPasswordError', 'Please confirm your password');
        isValid = false;
      } else if (confirmPassword !== formData.password) {
        showError('confirmPasswordError', 'Passwords do not match');
        isValid = false;
      }

      if (!isValid) return;

      if (!isOtpVerified) {
        showError('emailError', 'Please verify your email OTP before registering.');
        return;
      }


      try {
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

        // Send registration request
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
          // Registration successful
          showSuccess('Registration successful! Redirecting to login...');
          setTimeout(() => {
            window.location.href = '/login.html';
          }, 1500);
        } else {
          // Handle server-side validation errors
          const errorMsg = data.message || 'Registration failed. Please try again.';
          showError('formError', errorMsg);
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
      } catch (error) {
        console.error('Registration error:', error);
        showError('formError', 'An error occurred. Please try again.');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
      }
    });
  }

  // Helper function to show error messages
  function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
    }
  }

  // Helper function to show success message
  function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.textContent = message;

    const form = document.getElementById('registerForm');
    form.prepend(successDiv);

    // Remove success message after 3 seconds
    setTimeout(() => {
      successDiv.remove();
    }, 3000);
  }

  // Email validation helper
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // OTP Functionality
  const sendOtpBtn = document.getElementById("sendOtpBtn");
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    const emailInput = document.getElementById("email");
    const otpGroup = document.getElementById("otpGroup");
    const emailError = document.getElementById("emailError");
    const otpError = document.getElementById("otpError");

    // Send OTP
    sendOtpBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const name = document.getElementById("name").value.trim();
      if (!email) {
        emailError.textContent = "Please enter a valid email address";
        emailError.style.display = "block";
        return;
      }

      emailError.style.display = "none";
      sendOtpBtn.disabled = true;
      sendOtpBtn.textContent = "Sending...";

      try {
        const response = await fetch("/api/email/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name })
        });

        if (response.ok) {
          alert("OTP sent successfully! Check your email inbox.");
          otpGroup.style.display = "block";
          sendOtpBtn.style.display = "none"; // 🔒 Hide Send OTP after success
          emailInput.readOnly = true;        // Optional: lock email field
        } else {
          const errorText = await response.text();
          alert("Failed to send OTP: " + errorText);
        }
      } catch (error) {
        console.error("Error sending OTP:", error);
        alert("Error connecting to server");
      } finally {
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = "Send OTP";
      }
    });


    // Verify OTP
    verifyOtpBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const otp = document.getElementById("otp").value.trim();

      if (!otp) {
        otpError.textContent = "Please enter OTP";
        otpError.style.display = "block";
        return;
      }

      otpError.style.display = "none";

      try {
        const response = await fetch("/api/email/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp })
        });

        const message = await response.text();
        if (response.ok) {
          alert("✅ OTP Verified Successfully!");
          otpGroup.style.display = "none";
          isOtpVerified = true; // Mark verification success

          // Optional visual feedback
          const emailStatus = document.createElement("span");
          emailStatus.textContent = "✅ Email Verified";
          emailStatus.style.color = "#28a745";
          emailInput.parentNode.appendChild(emailStatus);

        } else {
          otpError.textContent = message;
          otpError.style.display = "block";
        }
      } catch (error) {
        console.error("Error verifying OTP:", error);
        otpError.textContent = "Server error. Try again later.";
        otpError.style.display = "block";
      }
    });


    // Email validation and Send OTP button control
    const emailInputField = document.getElementById('email');
    const sendOtpBtnField = document.getElementById('sendOtpBtn');

    // Initially hide the button
    sendOtpBtnField.style.display = 'none';

    // Function to validate email
    function isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    // Listen for changes in email input
    emailInputField.addEventListener('input', function() {
      const email = emailInputField.value.trim();

      if (isValidEmail(email)) {
        sendOtpBtnField.style.display = 'block';
        emailInputField.style.borderColor = '#28a745'; // Optional green border
      } else {
        sendOtpBtnField.style.display = 'none';
        emailInputField.style.borderColor = '#dc3545'; // Optional red border
      }
    });


});
