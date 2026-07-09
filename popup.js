document.addEventListener('DOMContentLoaded', () => {
  const radios = document.querySelectorAll('input[name="resolution"]');
  const statusMsg = document.getElementById('status-msg');
  let statusTimeout;

  function showStatus() {
    statusMsg.classList.add('show');
    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(() => {
      statusMsg.classList.remove('show');
    }, 2000);
  }

  // Load saved setting
  chrome.storage.local.get({ resolutionMode: 'default' }, (data) => {
    const selected = data.resolutionMode;
    const targetRadio = document.querySelector(`input[name="resolution"][value="${selected}"]`);
    if (targetRadio) {
      targetRadio.checked = true;
    }
  });

  // Save setting on change
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        chrome.storage.local.set({ resolutionMode: e.target.value }, () => {
          showStatus();
        });
      }
    });
  });
});
