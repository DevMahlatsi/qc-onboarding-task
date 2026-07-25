import { supabase } from './supabaseClient.js';

let isSignigIn = false;

const toggleButtons = document.querySelectorAll(".toggle-auth");
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');


const NAME_REGEX = /^[A-Za-z\s]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateName = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return 'This field is required.';
  if (!NAME_REGEX.test(trimmed)) return 'Only letters and spaces are allowed.';
  return null;
};

const validateEmail = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return 'Email is required.';
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address.';
  return null;
};

const validatePhone = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return 'Phone number is required.';
  if (!/^\d+$/.test(trimmed)) return 'Phone number must contain only digits.';
  if (!trimmed.startsWith('0')) return 'Phone number must start with 0.';
  if (trimmed.length < 10) return 'Phone number must be at least 10 digits.';
  return null;
};

const validatePassword = (value) => {
  if (!value) return 'Password is required.';
  return null;
};


const showError = (el, message) => {
  el.textContent = message;
};

const clearError = (el) => {
  el.textContent = '';
};

const friendlyMessage = (error) => {
  if (!error) return 'Something went wrong. Please try again.';
  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};


const handleRegister = async (event) => {
  event.preventDefault();
  clearError(registerError);

  const userPasswordRegister = document.getElementById("userPasswordRegister").value;
  const userEmailRegister = document.getElementById("userEmailRegister").value;
  const userFirstNameRegister = document.getElementById("userFirstNameRegister").value;
  const userLastNameRegister = document.getElementById("userLastNameRegister").value;
  const userPhoneNumberRegister = document.getElementById("userPhoneNumberRegister").value;

  const validators = [
    validateName(userFirstNameRegister),
    validateName(userLastNameRegister),
    validateEmail(userEmailRegister),
    validatePhone(userPhoneNumberRegister),
    validatePassword(userPasswordRegister),
  ];

  const firstFailure = validators.find(msg => msg !== null);
  if (firstFailure) {
    showError(registerError, firstFailure);
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-handler', {
      body: {
        action: 'register',
        email: userEmailRegister.trim(),
        password: userPasswordRegister,
        first_name: userFirstNameRegister.trim(),
        last_name: userLastNameRegister.trim(),
        phone: userPhoneNumberRegister.trim()
      }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    showError(registerError, '');
    registerError.style.color = '#12b76a';
    registerError.textContent = `Registered. Please check ${userEmailRegister} to confirm your email before signing in.`;
  }
  catch (error) {
    console.error('Registration error:', error);
    registerError.style.color = '#d92d20';
    showError(registerError, friendlyMessage(error));
  }
};


const handleLogin = async (event) => {
  event.preventDefault();
  clearError(loginError);

  const userPasswordLogin = document.getElementById("userPasswordLogin").value;
  const userEmailLogin = document.getElementById("userEmailLogin").value;

  const emailErr = validateEmail(userEmailLogin);
  const passErr = validatePassword(userPasswordLogin);
  if (emailErr || passErr) {
    showError(loginError, emailErr || passErr);
    return;
  }

  try {
    const { data, error } = await supabase.functions.invoke('auth-handler', {
      body: { action: 'login', email: userEmailLogin.trim(), password: userPasswordLogin }
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const session = data?.data?.session;
    if (!session?.access_token) {
      throw new Error('Login did not return a valid session.');
    }

    sessionStorage.setItem('qc_token', session.access_token);
    window.location.href = 'dashboard.html';
  }
  catch (error) {
    console.error('Login error:', error);
    showError(loginError, friendlyMessage(error));
  }
};

registerForm.addEventListener('submit', handleRegister);
loginForm.addEventListener('submit', handleLogin);

const handleAuth = () => {
  isSignigIn = !isSignigIn;
  clearError(loginError);
  clearError(registerError);

  if (isSignigIn) {
    loginForm.hidden = false;
    registerForm.hidden = true;
  }
  else {
    loginForm.hidden = true;
    registerForm.hidden = false;
  }
};

toggleButtons.forEach(button => {
  button.addEventListener("click", handleAuth);
});