/* script.js - Artsia Designs client (connects to Apps Script backend)
   This file replaces the existing booking behavior and connects to the Apps Script backend.
   IMPORTANT: After deploying the Apps Script web app, set CONFIG.APPS_SCRIPT_WEB_APP_URL to your deployed URL.
   Also set CONFIG.whatsappNumber to your WhatsApp number in international format (no + or spaces).
*/

const CONFIG = {
  APPS_SCRIPT_WEB_APP_URL: 'REPLACE_WITH_YOUR_APPS_SCRIPT_WEB_APP_URL', // e.g. https://script.google.com/macros/s/XXXX/exec
  whatsappNumber: 'YOUR_NUMBER_HERE', // e.g. '971501234567' (no +)
  email: 'you@example.com',
  name: 'Artsia Designs'
};

/* --- Helpers --- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* Mobile nav toggle and initial wiring */
document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');
  navToggle?.addEventListener('click', () => {
    const shown = navList.style.display === 'flex';
    navList.style.display = shown ? 'none' : 'flex';
  });

  // Year
  const year = new Date().getFullYear();
  document.getElementById('year').textContent = year;

  // Informational banner: times are Dubai time (GMT+4)
  const bookingHelp = document.getElementById('booking-help');
  if (bookingHelp) {
    const p = document.createElement('div');
    p.className = 'small';
    p.style.marginTop = '8px';
    p.innerHTML = '<strong>All times are in Dubai time (GMT+4).</strong> Please choose your date and time in Dubai time.';
    bookingHelp.parentNode.insertBefore(p, bookingHelp);
  }

  setupWhatsAppButtons();
  setupBooking();
  setupContactForm();
});

/* Toast */
function showToast(msg = '', timeout = 2500) {
  let t = document.getElementById('artsia-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'artsia-toast';
    Object.assign(t.style, {
      position: 'fixed',
      right: '18px',
      bottom: '18px',
      background: 'rgba(20,20,28,0.94)',
      color: 'white',
      padding: '10px 14px',
      borderRadius: '10px',
      boxShadow: '0 8px 24px rgba(16,16,28,0.3)',
      zIndex: 9999,
      fontSize: '14px'
    });
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(()=> t.remove(), 300);
  }, timeout);
}

/* WhatsApp buttons wiring (opens admin WhatsApp or owner's default chat to start conversation) */
function setupWhatsAppButtons(){
  const heroBtn = $('#whatsappHero');
  const bookingBtn = $('#whatsappBooking');
  const footerBtn = $('#whatsappFooter');

  const handler = (ev) => {
    ev.preventDefault();
    openWhatsAppWithText(`Hi! I found you on Artsia Designs and I'd like to discuss a design project.`);
  };

  [heroBtn, bookingBtn, footerBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', handler);
  });

  $('#whatsFromContact')?.addEventListener('click', () => {
    const name = $('#cname')?.value?.trim() || 'Hello';
    const message = $('#cmessage')?.value?.trim() || '';
    openWhatsAppWithText(`Hi, I'm ${name}. ${message}`);
  });
}

function openWhatsAppWithText(text){
  const number = CONFIG.whatsappNumber;
  if (!number || number.includes('YOUR_NUMBER')) {
    showToast('Please set your WhatsApp number in script.js (CONFIG.whatsappNumber).');
    return;
  }
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/${number}?text=${encoded}`;
  window.open(url, '_blank');
}

/* Booking: fetch available slots from backend and submit bookings
   The frontend treats date (YYYY-MM-DD) and time (HH:MM) as Dubai-local values and does NOT convert them.
*/
async function loadAvailableSlots(date) {
  const timeSelect = $('#time');
  timeSelect.innerHTML = '<option>Loading...</option>';
  if (!CONFIG.APPS_SCRIPT_WEB_APP_URL || CONFIG.APPS_SCRIPT_WEB_APP_URL.includes('REPLACE')) {
    timeSelect.innerHTML = '<option value="">Configure backend URL</option>';
    return;
  }
  try {
    const url = `${CONFIG.APPS_SCRIPT_WEB_APP_URL}?action=availability&date=${encodeURIComponent(date)}`;
    const res = await fetch(url);
    const data = await res.json();
    timeSelect.innerHTML = '';
    if (!data || !Array.isArray(data.slots) || data.slots.length === 0) {
      timeSelect.innerHTML = '<option value="">No available slots on this date</option>';
      return;
    }
    data.slots.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.val;
      opt.textContent = `${s.label} (Dubai time)`;
      timeSelect.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    timeSelect.innerHTML = '<option value="">Error loading slots</option>';
  }
}

function setupBooking(){
  const dateInput = $('#date');
  const timeSelect = $('#time');
  const bookingForm = $('#bookingForm');
  const submitBtn = bookingForm?.querySelector('button[type="submit"]');

  dateInput?.addEventListener('change', () => {
    const date = dateInput.value;
    if (!date) {
      timeSelect.innerHTML = '<option value="">Pick a date first</option>';
      return;
    }
    loadAvailableSlots(date);
  });

  // Prefill tomorrow
  if (!dateInput.value) {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    dateInput.value = tmr.toISOString().slice(0,10);
    dateInput.dispatchEvent(new Event('change'));
  }

  bookingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    const name = $('#name').value.trim();
    const email = $('#email').value.trim();
    const whatsapp = $('#whatsapp').value.trim();
    const service = $('#service').value;
    const date = $('#date').value;
    const time = $('#time').value;
    const notes = $('#notes').value.trim();

    if (!name || !email || !date || !time || !service) {
      showToast('Please fill name, email, service, date, and time.');
      submitBtn.disabled = false;
      return;
    }

    // WhatsApp number validation: encourage international format
    if (whatsapp && !/^\+?[0-9\s\-()]+$/.test(whatsapp)) {
      showToast('Please enter a valid WhatsApp number including country code (e.g. +97150...)');
      submitBtn.disabled = false;
      return;
    }
    // normalize whatsapp: remove spaces/()/- but keep leading + if present
    const normalizedWhats = whatsapp ? whatsapp.replace(/[\s()\-]/g,'') : '';

    if (!CONFIG.APPS_SCRIPT_WEB_APP_URL || CONFIG.APPS_SCRIPT_WEB_APP_URL.includes('REPLACE')) {
      showToast('Backend not configured. Set APPS_SCRIPT_WEB_APP_URL in script.js.');
      submitBtn.disabled = false;
      return;
    }

    const payload = { name, email, whatsapp: normalizedWhats, service, date, time, notes, timezone: 'Asia/Dubai' };

    try {
      const res = await fetch(`${CONFIG.APPS_SCRIPT_WEB_APP_URL}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'book', booking: payload})
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('Request submitted — status: Pending. You will be notified after review.');
        bookingForm.reset();
        // reload availability so the temporarily reserved slot (Pending) is excluded
        await loadAvailableSlots(date);
      } else {
        showToast('Could not submit booking: ' + (data.message||'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      showToast('Network error: booking not submitted.');
    }
    submitBtn.disabled = false;
  });
}

/* Contact form fallback (mailto) remains */
function setupContactForm(){
  const form = $('#contactForm');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#cname').value.trim();
    const message = $('#cmessage').value.trim();
    if (!name || !message) {
      showToast('Please enter name and message.');
      return;
    }
    const subject = encodeURIComponent(`${CONFIG.name} - Message from ${name}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name}`);
    const mailto = `mailto:${CONFIG.email}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  });
}
