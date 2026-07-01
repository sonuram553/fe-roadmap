// ── Helpers ───────────────────────────────────────────────

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── 1. Text encode/decode ─────────────────────────────────

function updateEncode() {
  const val = document.getElementById("enc-in").value;
  const enc = document.getElementById("enc-out");
  const dec = document.getElementById("dec-out");
  try {
    const encoded = toBase64(val);
    const decoded = fromBase64(encoded);
    enc.textContent = encoded;
    enc.className = "out";
    dec.textContent = decoded;
    dec.className = "out";
  } catch (e) {
    enc.textContent = e.message;
    enc.className = "out err";
  }
}

document.getElementById("enc-in").addEventListener("input", updateEncode);
updateEncode();

// ── 2. Image data URL ─────────────────────────────────────

document.getElementById("file-in").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    const url = ev.target.result;
    const preview = document.getElementById("img-preview");
    preview.innerHTML = "";
    const img = document.createElement("img");
    img.src = url;
    preview.appendChild(img);
    document.getElementById("data-url-out").textContent =
      url.slice(0, 100) + " …(" + url.length + " chars)";
  };
  reader.readAsDataURL(file);
});

// ── 3. JWT Inspector ──────────────────────────────────────

function updateJWT() {
  const token = document.getElementById("jwt-in").value.trim();
  const container = document.getElementById("jwt-parts");
  const parts = token.split(".");
  if (parts.length !== 3) {
    container.innerHTML =
      '<div class="out err wide">Not a valid JWT — expected 3 parts separated by "."</div>';
    return;
  }
  const defs = [
    { label: "Header", cls: "jwt-part-h", raw: parts[0], decode: true },
    { label: "Payload", cls: "jwt-part-p", raw: parts[1], decode: true },
    { label: "Signature", cls: "jwt-part-s", raw: parts[2], decode: false },
  ];
  container.innerHTML = defs
    .map((d) => {
      let content = d.raw;
      if (d.decode) {
        try {
          content = JSON.stringify(JSON.parse(b64urlDecode(d.raw)), null, 2);
        } catch {
          content = "(decode error)";
        }
      }
      return `<div class="jwt-part ${d.cls}">
      <div class="jwt-label">${d.label}</div>
      <div class="jwt-content">${esc(content)}</div>
    </div>`;
    })
    .join("");
}

document.getElementById("jwt-in").addEventListener("input", updateJWT);
updateJWT();

// ── 4. btoa limitation ────────────────────────────────────

function updateBtoa() {
  const val = document.getElementById("btoa-in").value;
  const raw = document.getElementById("btoa-raw");
  const fix = document.getElementById("btoa-fix");
  try {
    raw.textContent = btoa(val);
    raw.className = "out err";
  } catch (e) {
    raw.textContent = e.name + ": " + e.message;
    raw.className = "out err";
  }
  try {
    fix.textContent = toBase64(val);
    fix.className = "out";
  } catch (e) {
    fix.textContent = e.message;
    fix.className = "out err";
  }
}

document.getElementById("btoa-in").addEventListener("input", updateBtoa);
updateBtoa();
