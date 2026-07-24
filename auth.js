// const { supabaseAuth } = require("./supabase/functions/auth-handler");
import { supabaseAuth } from "./supabase/functions/auth-handler/index.js";

 let isSignigIn = false;

  const toggleButtons = document.querySelectorAll(".toggle-auth");
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');


  const handleRegister = async (event) => {
    event.preventDefault();

    const userPasswordRegister = document.getElementById("userPasswordRegister").value;
    const userEmailRegister = document.getElementById("userEmailRegister").value;
    const userFirstNameRegister = document.getElementById("userFirstNameRegister").value;
    const userLastNameRegister = document.getElementById("userLastNameRegister").value;
    const userPhoneNumberRegister = document.getElementById("userPhoneNumberRegister").value;

    try {
      const { error: registerError, data: registerData } = await supabaseAuth.auth.signUp({
        email: userEmailRegister,
        password: userPasswordRegister,
        options: {
          data: {
            phone: userPhoneNumberRegister,
            first_name: userFirstNameRegister,
            last_name: userLastNameRegister
          }
        }
      });

      if (registerError) {
        throw registerError;
      }

      window.alert(`Assuming everything went well, please check your emails for account: ${userEmailRegister} and confirm the email.`);
    }
    catch (error) {
      console.error('Registration error:', error);
      window.alert(`Registration failed: ${error.message}`);
    }
  };
  const handleLogin = async (event) =>{
    event.preventDefault();

    const userPasswordLogin = document.getElementById("userPasswordLogin");
    const userEmailLogin = document.getElementById("userEmailLogin");
    
    const {error: loginError, data: loginData} = await supabaseAuth.auth.signInWithPassword({
      email: userEmailLogin,
      password: userPasswordLogin
    })
  }
  registerForm.addEventListener('submit', handleRegister);
  loginForm.addEventListener('submit', handleLogin);


  
  
  

  const handleAuth = () =>{
    isSignigIn = !isSignigIn;

    if (isSignigIn){
      // isSigninigIn=false;
      loginForm.hidden = false;
      registerForm.hidden = true

      


    }
    else{
      // isSigninigIn=true;
      loginForm.hidden = true;
      registerForm.hidden= false;
    }
  }
  
  

  toggleButtons.forEach(button => {
    button.addEventListener("click", handleAuth);
});


