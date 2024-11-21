function showError(field, message) {
  const errorContainer = document.querySelector(`[data-field="${field}"]`);
  errorContainer.style.display = 'flex';
  errorContainer.querySelector('span').textContent = message;
}

function clearAllErrors() {
  document.querySelectorAll('.error-message').forEach(el => {
    el.style.display = 'none';
    el.querySelector('span').textContent = '';
  });
}

const colorPicker = document.getElementById('color');
let selectedColor = colors[0];

colors.forEach(color => {
  const colorOption = document.createElement('div');
  colorOption.className = 'color-option';
  colorOption.style.backgroundColor = color;
  colorOption.addEventListener('click', () => {
    document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
    colorOption.classList.add('selected');
    selectedColor = color;
    updatePreview();
  });
  colorPicker.appendChild(colorOption);
});

const iconSelector = document.getElementById('icon');
let selectedIcon = icons[0];

icons.forEach(icon => {
  const iconOption = document.createElement('div');
  iconOption.className = 'icon-option';
  iconOption.textContent = icon;
  iconOption.addEventListener('click', () => {
    document.querySelectorAll('.icon-option').forEach(opt => opt.classList.remove('selected'));
    iconOption.classList.add('selected');
    selectedIcon = icon;
    updatePreview();
  });
  iconSelector.appendChild(iconOption);
});

const tagsInput = document.getElementById('tags-input');
const tagInput = document.getElementById('tag-input');
const tags = new Set();

tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && tagInput.value.trim() !== '' && tags.size < 5) {
    e.preventDefault();
    const tag = tagInput.value.trim();
    if (!tags.has(tag)) {
      tags.add(tag);
      const tagElement = document.createElement('span');
      tagElement.className = 'tag';
      tagElement.innerHTML = `${tag} <span class="tag-remove">×</span>`;
      tagElement.querySelector('.tag-remove').addEventListener('click', () => {
        tags.delete(tag);
        tagElement.remove();
        updatePreview();
      });
      tagsInput.insertBefore(tagElement, tagInput);
      tagInput.value = '';
      updatePreview();
    }
  }
});

const descriptionTextarea = document.getElementById('description');
const descriptionCharCount = document.getElementById('description-char-count');

descriptionTextarea.addEventListener('input', () => {
  const length = descriptionTextarea.value.length;
  descriptionCharCount.textContent = length;
  updatePreview();
});

function updatePreview() {
  const name = document.getElementById('name').value || 'Community Name';
  const description = document.getElementById('description').value || 'Community description will appear here.';

  document.getElementById('preview-name').textContent = name;
  document.getElementById('preview-description').textContent = description;
  document.getElementById('preview-icon').textContent = selectedIcon;
  document.getElementById('preview-icon').style.backgroundColor = selectedColor;

  const previewTags = document.getElementById('preview-tags');
  previewTags.innerHTML = '';
  tags.forEach(tag => {
    const tagElement = document.createElement('span');
    tagElement.className = 'preview-tag';
    tagElement.textContent = tag;
    previewTags.appendChild(tagElement);
  });
}

const form = document.getElementById('create-form');
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  try {
    const formData = new FormData(form);
    formData.append('color', selectedColor);
    formData.append('icon', selectedIcon);
    formData.append('tags', Array.from(tags));
    console.log(formData);
    console.log(Object.fromEntries(formData));
    const response = await fetch('/sozdat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': formData.get('_csrf')
      },
      body: JSON.stringify(Object.fromEntries(formData))
    });

    const data = await response.json();
    clearAllErrors();

    if (!response.ok) {
      if (data.errors) {
        for (const [field, message] of Object.entries(data.errors))
          showError(field, message);
      } else {
        alert(data.error || 'An error occurred while creating the community.');
      }
      return;
    }

  } catch (err) {
    alert('An error occurred while creating the community.');
    return;
  }

  alert('Community created successfully!');
});

updatePreview();

document.querySelectorAll('input, textarea').forEach(input => {
  input.addEventListener('input', updatePreview);
});