// Shared by the community and research forms: shrinks an image in the browser
// and sends the entry to a Google script as plain text (no CORS preflight).

export function shrink(file, max = 600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('This image could not be read.'));
    img.src = URL.createObjectURL(file);
  });
}

// Wires up one form: `collect(formData)` returns the entry to send; the image
// field (if any) is shrunk and added under `imageKey`.
export function wireForm(form, { collect, imageField, imageKey, onDone }) {
  const status = form.querySelector('.cm-status');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (!form.dataset.endpoint) {
      status.textContent = 'The form is not open yet. Please write to info@ecime.org in the meantime.';
      return;
    }
    const f = new FormData(form);
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    status.textContent = 'Sending…';
    try {
      const body = collect(f);
      const file = imageField && f.get(imageField);
      if (file && file.size) body[imageKey] = await shrink(file);
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || 'not saved');
      form.reset();
      onDone?.();
      status.textContent = 'Thank you! Your entry will appear on the site after a short check.';
    } catch (err) {
      status.textContent = 'Sending did not work (' + err.message + '). Please try again, or write to info@ecime.org.';
    } finally {
      button.disabled = false;
    }
  });
}
