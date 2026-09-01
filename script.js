/* script.js
   Controls:
   - mobile nav toggle
   - year injection
   - booking time slot population per availability rules
   - booking form submission (opens mailto for a simple request)
   - WhatsApp buttons (open wa.me with a pre-filled message)
   Edit the CONFIG constants at the top to match your phone/email.
*/

const CONFIG = {
  // Put your WhatsApp phone number here in international format, no plus or dashes.
  // Example: '15551234567' or '447911123456'
  whatsappNumber: 'YOUR_NUMBER_HERE',
  // Default email to receive booking requests
  email: 'you@example.com',
  // Business name to appear in prefilled messages
  name: 'Artsia Designs'
};

/* --- Helpers --- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* Mobile nav toggle */
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

  // WhatsApp buttons
  setupWhatsAppButtons();

  // Booking form behavior
  setupBooking();
  // Contact form
  setupContactForm();
});

/* Populate time slots according to availability rules:
   - Weekdays (Mon-Fri): 16:00–20:00 (slots start: 16:00,17:00,18:00,19:00)
   - Saturday & Sunday: 10:00–17:00 (slots: 10:00..16:00)
*/
function timesForDate(dateObj) {
  const day = dateObj.getDay(); // 0 Sunday ... 6 Saturday
  let startHour, endHour;
  if (day === 0 || day === 6) {
    startHour = 10;
    endHour = 17;
  } else {
    startHour = 16;
    endHour = 20;
  }
  const slots = [];
  for (let h = startHour; h < endHour; h++) {
    const label = formatHourLabel(h);
    const val = `${String(h).padStart(2,'0')}:00`;
    slots.push({label, val});
  }
  return slots;
}

function formatHourLabel(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12) + 1;
  return `${hour12}:00 ${suffix}`;
}

/* Booking setup */
function setupBooking(){
  const dateInput = $('#date');
  const timeSelect = $('#time');
  const bookingForm = $('#bookingForm');

  dateInput?.addEventListener('change', () => {
    const v = dateInput.value;
    if (!v) {
      timeSelect.innerHTML = '<option value="">Pick a date first</option>';
      return;
    }
    const d = new Date(v + 'T00:00:00');
    const slots = timesForDate(d);
    timeSelect.innerHTML = '';
    for (const s of slots) {
      const opt = document.createElement('option');
      opt.value = s.val;
      opt.textContent = s.label;
      timeSelect.appendChild(opt);
    }
  });

  // Prefill with tomorrow's date by default
  if (!dateInput.value) {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    dateInput.value = tmr.toISOString().slice(0,10);
    dateInput.dispatchEvent(new Event('change'));
  }

  bookingForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#name').value.trim();
    const email = $('#email').value.trim();
    const date = $('#date').value;
    const time = $('#time').value;
    const notes = $('#notes').value.trim();

    if (!name || !email || !date || !time) {
      showToast('Please complete the required fields.');
      return;
    }

    const subject = encodeURIComponent(`${CONFIG.name} - Booking request from ${name}`);
    const body = encodeURIComponent(`Name: ${name}
Email: ${email}
Date: ${date}
Time: ${time}
Notes:
${notes}

Please confirm the session. Thank you!
`);
    const mailto = `mailto:${CONFIG.email}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
    showToast('Opening your mail client to send the booking request.');
  });
}

/* Contact form behavior */
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

  $('#whatsFromContact')?.addEventListener('click', openWhatsAppFromContact);
}

/* WhatsApp utilities */
function setupWhatsAppButtons(){
  const heroBtn = $('#whatsappHero');
  const bookingBtn = $('#whatsappBooking');
  const footerBtn = $('#whatsappFooter');
  const handler = (ev) => {
    ev.preventDefault();
    openWhatsAppWithText(`Hi! I found you on Artsia Designs and I'd like to discuss a design project. Could we chat?`);
  };
  [heroBtn, bookingBtn, footerBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', handler);
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

function openWhatsAppFromContact(){
  const name = $('#cname').value.trim();
  const message = $('#cmessage').value.trim();
  const text = `Hi, I'm ${name || 'interested in a project'}. ${message || ''}`;
  openWhatsAppWithText(text);
}

/* Small toast for feedback */
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
