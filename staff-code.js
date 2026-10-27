/* קוד צוות הופה לגיליון — מוקלד פעם אחת בכל מכשיר ונשמר בדפדפן,
   באותו מקום שבו דף הניהול (index.html) ולוח המשימות (lakh.html) שומרים אותו.
   הקוד עצמו לא כתוב באף קובץ באתר. דף שמשתמש ב-GS_SECRET מבקש אותו רק כשצריך (תצוגת ניהול). */
(function () {
  var K = 'hopa_api_secret';
  var EXEC = 'https://script.google.com/macros/s/AKfycby7ilGQKB0eypgYMJ0-F4PDgRUlhs12wB5NQVV3_gsm4U1iWec4aNzmeQ8qi7dFFBUoGw/exec';
  var mem = '', asked = false;
  function lsGet() { try { return localStorage.getItem(K) || ''; } catch (e) { return ''; } }
  function lsSet(v) { try { if (v) localStorage.setItem(K, v); else localStorage.removeItem(K); } catch (e) {} }

  function verify(c) {
    fetch(EXEC + '?action=checkCode&secret=' + encodeURIComponent(c), { credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok && !d.staff) {
          window.staffCodeReset();
          alert('קוד הצוות לא נכון. רעננו את הדף ונסו שוב.');
        }
      }).catch(function () {});
  }

  window.staffCode = function () {
    var c = mem || lsGet();
    if (c === 'hopa-nihul-2026') c = '';            // הקוד הישן בוטל
    if (!c && !asked) {
      asked = true;
      c = (prompt('קוד צוות הופה (פעם אחת במכשיר הזה):') || '').trim();
      if (c) { lsSet(c); verify(c); }
    }
    mem = c;
    return c;
  };
  window.staffCodeReset = function () { mem = ''; asked = false; lsSet(''); };

  /* השרת החזיר unauthorized (קוד חסר/שגוי) — מציג תיבה להקליד את הקוד במקום "לא נטען" */
  window.staffCodeFail = function (e, el) {
    if (!e || String(e.message) !== 'unauthorized' || !el) return false;
    window.staffCodeReset();
    el.innerHTML = '<div class="card" dir="rtl"><p class="hint" style="margin-bottom:10px">כדי לראות את התשובות צריך את קוד הצוות של הופה (פעם אחת במכשיר הזה).</p>' +
      '<form id="scForm" style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<input id="scIn" type="password" autocomplete="off" placeholder="קוד הצוות" style="flex:1;min-width:160px;padding:10px 12px;border:1px solid #ccc;border-radius:10px;font:inherit">' +
      '<button class="btn" type="submit">הצגת התשובות</button></form></div>';
    var f = document.getElementById('scForm');
    f.onsubmit = function (ev) {
      ev.preventDefault();
      var v = (document.getElementById('scIn').value || '').trim();
      if (!v) return;
      lsSet(v);
      location.reload();
    };
    document.getElementById('scIn').focus();
    return true;
  };
  Object.defineProperty(window, 'GS_SECRET', { get: window.staffCode, configurable: true });
})();
