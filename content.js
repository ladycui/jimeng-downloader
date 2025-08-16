console.log("Jimeng Downloader: Content script injected and running (v2).");

// Use a WeakMap to keep track of buttons and their removal timers
const buttonState = new WeakMap();

function removeButton(img) {
    if (buttonState.has(img)) {
        const { button, timer } = buttonState.get(img);
        if (button && button.parentNode) {
            button.parentNode.removeChild(button);
            console.log('Jimeng Downloader: Removed button for image:', img.src);
        }
        if (timer) {
            clearTimeout(timer);
        }
        buttonState.delete(img);
    }
}

function scheduleRemoveButton(img) {
    if (buttonState.has(img)) {
        const state = buttonState.get(img);
        // Clear any existing timer
        if (state.timer) {
            clearTimeout(state.timer);
        }
        // Schedule new removal
        state.timer = setTimeout(() => removeButton(img), 300);
        buttonState.set(img, state);
    }
}

function cancelButtonRemoval(img) {
    if (buttonState.has(img)) {
        const state = buttonState.get(img);
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
            buttonState.set(img, state);
        }
    }
}

function createOrShowButton(img) {
    cancelButtonRemoval(img);

    if (buttonState.has(img)) {
        // Button already exists, just make sure it's visible and positioned correctly
        const { button } = buttonState.get(img);
        const rect = img.getBoundingClientRect();
        button.style.top = `${rect.top + window.scrollY + 10}px`;
        button.style.left = `${rect.left + window.scrollX + 10}px`;
        button.style.opacity = '1';
        return;
    }

    console.log('Jimeng Downloader: Creating button for image:', img.src);
    const rect = img.getBoundingClientRect();

    const btn = document.createElement('button');
    btn.classList.add('jimeng-download-btn');
    btn.style.backgroundImage = `url(${chrome.runtime.getURL('download-icon.svg')})`;
    btn.style.position = 'absolute';
    btn.style.top = `${rect.top + window.scrollY + 10}px`;
    btn.style.left = `${rect.left + window.scrollX + 10}px`;
    btn.style.opacity = '1'; // Make it visible immediately on hover

    document.body.appendChild(btn);

    // Store button and associate it with the image
    buttonState.set(img, { button: btn, timer: null });

    btn.addEventListener('mouseenter', () => cancelButtonRemoval(img));
    btn.addEventListener('mouseleave', () => scheduleRemoveButton(img));
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Jimeng Downloader: Download button clicked.');
        downloadImageAsPng(img);
        removeButton(img); // Remove button after click
    });
}

function handleImageHover(img) {
    if (img.dataset.jimengHoverAttached) return;
    img.dataset.jimengHoverAttached = 'true';

    img.addEventListener('mouseenter', () => {
        if (img.naturalWidth >= 100 && img.naturalHeight >= 100) {
            createOrShowButton(img);
        }
    });
    img.addEventListener('mouseleave', () => scheduleRemoveButton(img));
}

function downloadImageAsPng(img) {
    console.log('Jimeng Downloader: Starting download for image:', img.src);
    const imageUrl = img.src;
    const baseFilename = (imageUrl.substring(imageUrl.lastIndexOf('/') + 1) || 'image').split(/[?#]/)[0].replace(/\.[^/.]+$/, "") || 'image';
    const sanitizedFilename = baseFilename.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${sanitizedFilename}.png`;
    console.log(`Jimeng Downloader: Sanitized filename is "${filename}".`);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tempImg = new Image();
    tempImg.crossOrigin = "Anonymous";

    tempImg.onload = () => {
        canvas.width = tempImg.naturalWidth;
        canvas.height = tempImg.naturalHeight;
        ctx.drawImage(tempImg, 0, 0);
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            chrome.runtime.sendMessage({ action: "download", url: url, filename: filename }, () => {
                URL.revokeObjectURL(url);
            });
        }, 'image/png');
    };
    tempImg.onerror = () => {
        // console.warn('Jimeng Downloader: Canvas conversion failed. Falling back to direct download.');
        chrome.runtime.sendMessage({ action: "download", url: imageUrl, filename: filename });
    };

    fetch(imageUrl)
        .then(response => response.ok ? response.blob() : Promise.reject('Fetch failed'))
        .then(blob => { tempImg.src = URL.createObjectURL(blob); })
        .catch(() => { tempImg.src = imageUrl; });
}

function processAllImages() {
    document.querySelectorAll('img:not([data-jimeng-hover-attached])').forEach(img => {
        if (img.complete && img.naturalHeight !== 0) {
            handleImageHover(img);
        } else {
            img.addEventListener('load', () => handleImageHover(img), { once: true });
        }
    });
}

// Initial run
setTimeout(processAllImages, 1000);

// Observe for new images
const observer = new MutationObserver(processAllImages);
observer.observe(document.body, { childList: true, subtree: true });
// console.log("Jimeng Downloader: MutationObserver is now watching the DOM.");
