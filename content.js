function addDownloadButtonToImage(img) {
    if (img.dataset.jimengProcessed) {
        return;
    }

    const isLoaded = img.complete && img.naturalHeight !== 0;
    if (isLoaded) {
        if (img.naturalWidth < 100 || img.naturalHeight < 100) {
            img.dataset.jimengProcessed = 'true';
            return;
        }
        wrapImageAndAddButton(img);
    } else {
        img.addEventListener('load', () => addDownloadButtonToImage(img), { once: true });
    }
}

function wrapImageAndAddButton(img) {
    if (img.parentNode.classList.contains('jimeng-image-wrapper')) return;

    const wrapper = document.createElement('div');
    wrapper.classList.add('jimeng-image-wrapper');
    
    const imgStyle = window.getComputedStyle(img);
    wrapper.style.display = 'inline-block';
    wrapper.style.position = 'relative';
    wrapper.style.width = img.offsetWidth + 'px';
    wrapper.style.height = img.offsetHeight + 'px';
    
    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    img.style.position = 'static';
    img.style.top = 'auto';
    img.style.left = 'auto';
    img.style.width = '100%';
    img.style.height = '100%';

    const btn = document.createElement('button');
    btn.classList.add('jimeng-download-btn');
    btn.style.backgroundImage = `url(${chrome.runtime.getURL('download-icon.svg')})`;
    wrapper.appendChild(btn);

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        downloadImageAsPng(img);
    });

    img.dataset.jimengProcessed = 'true';
}

function downloadImageAsPng(img) {
    const imageUrl = img.src;
    const baseFilename = (imageUrl.substring(imageUrl.lastIndexOf('/') + 1) || 'image').split(/[?#]/)[0].replace(/\.[^/.]+$/, "") || 'image';
    // Sanitize the filename to remove illegal characters
    const sanitizedFilename = baseFilename.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `${sanitizedFilename}.png`;

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
            chrome.runtime.sendMessage({
                action: "download",
                url: url,
                filename: filename
            }, () => {
                URL.revokeObjectURL(url);
            });
        }, 'image/png');
    };

    tempImg.onerror = () => {
        // Fallback for CORS or other errors
        chrome.runtime.sendMessage({
            action: "download",
            url: imageUrl,
            filename: filename
        });
    };

    fetch(imageUrl, { mode: 'cors' })
        .then(response => {
            if (!response.ok) throw new Error('CORS fetch failed');
            return response.blob();
        })
        .then(blob => {
            const objectURL = URL.createObjectURL(blob);
            tempImg.src = objectURL;
        })
        .catch(() => {
            tempImg.src = imageUrl;
        });
}

function processAllImages() {
    document.querySelectorAll('img').forEach(addDownloadButtonToImage);
}

// Initial run after a short delay
setTimeout(processAllImages, 500);

// Observe DOM changes for new images
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // Element node
                    if (node.tagName === 'IMG') {
                        addDownloadButtonToImage(node);
                    } else {
                        node.querySelectorAll('img').forEach(addDownloadButtonToImage);
                    }
                }
            });
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });
