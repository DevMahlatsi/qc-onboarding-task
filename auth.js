 let isSignigIn = false;

  const toggleButtons = document.querySelectorAll(".toggle-auth");
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');


  const handleRegister =(event) =>{
    event.preventDefault();
  }
  const handleLogin = (event) =>{
    event.preventDefault();
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


