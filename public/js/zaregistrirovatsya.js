document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('signup-form');
  const errorContainer = document.getElementById('error-container');
  const errorMessage = errorContainer.querySelector('.error-message');
  
  function showError(message, fieldErrors = {}) {
    document.querySelectorAll('.field-error').forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    
    Object.entries(fieldErrors).forEach(([field, error]) => {
      const errorSpan = document.querySelector(`[data-field="${field}"]`);
      if (errorSpan) {
        errorSpan.textContent = error;
        errorSpan.style.display = 'block';
      }
    });
    
    if (message) {
      errorMessage.textContent = message;
      errorContainer.style.display = 'block';
    }
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    errorContainer.style.display = 'none';
    
    try {
      const formData = new FormData(form);
      const response = await fetch('/zaregistrirovatsya', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': formData.get('_csrf')
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.errors) {
          showError('Please correct the errors below.', data.errors);
        } else {
          showError(data.error || 'An error occurred during registration.');
        }
        return;
      }
      
      alert("You have successfully registered! You will now be redirected to the welcome page.");
      window.location.href = '/dobro-pozhalovat';
      
    } catch (error) {
      showError('An unexpected error occurred. Please try again later.');
      console.error('Registration error:', error);
    }
  });
});