// 기존 문자 수 카운팅 코드는 유지
const titleInput = document.getElementById('title');
const contentTextarea = document.getElementById('content');
const titleCharCount = document.getElementById('title-char-count');
const contentCharCount = document.getElementById('content-char-count');
const form = document.getElementById('post-form');
const DATA = JSON.parse(document.getElementById('__DANNYYE_O_SOOBSHCHESTVE__').textContent);

const LIMITS = {
  title: 300,
  content: 40000
};

function updateCharCount(input, display, maxLength) {
  const length = input.value.length;
  display.textContent = length;
  display.style.color = length > maxLength ? 'red' : '';
}

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
}

titleInput.addEventListener('input', () => updateCharCount(titleInput, titleCharCount, LIMITS.title));
contentTextarea.addEventListener('input', () => updateCharCount(contentTextarea, contentCharCount, LIMITS.content));

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (titleInput.value.length > LIMITS.title || contentTextarea.value.length > LIMITS.content) {
    showError('Content length exceeds maximum limit');
    return;
  }

  try {
    const formData = new FormData(form);
    formData.append('targetLanguage', "RU");
    formData.append('communityName', DATA.name);
    const response = await fetch('/i/CreatePost', {
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
        showError('Please correct the errors below', data.errors);
      } else {
        showError(data.error || 'An error occurred while submitting the post');
      }
      return;
    }

    window.location.href = `/b/${DATA.name}/${data.id}`;
  } catch (error) {
    console.error('Post submission error:', error);
    showError('An unexpected error occurred. Please try again later.');
  }
});