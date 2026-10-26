(function () {
  var $app = document.getElementById('app');
  var KEY = 'tbq_v1';
  var S = { favs: [], days: [], played: 0, best: 0, right: 0, asked: 0 };
  try { var raw = localStorage.getItem(KEY); if (raw) S = Object.assign(S, JSON.parse(raw)); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function dayNum(d) { return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000); }
  function dateStr(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  var todayNum = dayNum(new Date());
  var viewOffset = 0;

  // record today's visit for streak
  var ts = dateStr(new Date());
  if (S.days.indexOf(ts) === -1) { S.days.push(ts); S.days = S.days.slice(-400); save(); }

  function streak() {
    var set = {}; S.days.forEach(function (d) { set[d] = 1; });
    var n = 0, d = new Date();
    while (set[dateStr(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- Today ----------
  function renderToday() {
    var idx = (((todayNum + viewOffset) % DEVOS.length) + DEVOS.length) % DEVOS.length;
    var d = DEVOS[idx];
    var when = new Date(); when.setDate(when.getDate() + viewOffset);
    var isFav = S.favs.indexOf(idx) !== -1;
    var label = viewOffset === 0 ? "Today's Devotion" : when.toDateString();
    $app.innerHTML =
      '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center">' +
      '<span class="label">' + esc(label) + '</span>' +
      '<button class="fav" id="fav" aria-label="Save">' + (isFav ? '★' : '☆') + '</button></div>' +
      '<h2>' + esc(d.t) + '</h2>' +
      '<div class="verse">' + esc(d.v) + '<div class="ref">— ' + esc(d.ref) + '</div></div>' +
      '<div>' + esc(d.r) + '</div>' +
      '<div class="prayer"><b>ప్రార్థన:</b> ' + esc(d.p) + '</div>' +
      '<div class="row"><button class="btn" id="share">Share</button>' +
      '<button class="btn alt" id="prev">← Previous</button>' +
      '<button class="btn alt" id="next">Next →</button>' +
      (viewOffset !== 0 ? '<button class="btn alt" id="now">Today</button>' : '') + '</div></div>' +
      '<div class="card"><span class="label">Quick start</span><p style="margin:.4rem 0 0">పరీక్షించుకొనుడి — Test your Bible knowledge with a 10-question quiz.</p>' +
      '<div class="row"><button class="btn" id="goquiz">Start Quiz</button></div></div>';
    document.getElementById('fav').onclick = function () {
      var p = S.favs.indexOf(idx);
      if (p === -1) S.favs.push(idx); else S.favs.splice(p, 1);
      save(); renderToday();
    };
    document.getElementById('share').onclick = function () {
      var text = d.t + '\n' + d.v + ' (' + d.ref + ')\n\n' + d.r + '\n\nప్రార్థన: ' + d.p;
      if (navigator.share) { navigator.share({ title: d.t, text: text }).catch(function () {}); }
      else if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function () { alert('Copied to clipboard'); }); }
    };
    document.getElementById('prev').onclick = function () { viewOffset--; renderToday(); };
    document.getElementById('next').onclick = function () { viewOffset++; renderToday(); };
    var now = document.getElementById('now'); if (now) now.onclick = function () { viewOffset = 0; renderToday(); };
    document.getElementById('goquiz').onclick = function () { setTab('quiz'); };
  }

  // ---------- Quiz ----------
  var Q = null;
  function renderQuizHome() {
    Q = null;
    $app.innerHTML =
      '<div class="card"><span class="label">Bible Quiz</span><h2>బైబిల్ క్విజ్</h2>' +
      '<p>10 random questions from ' + QUIZ.length + '. Each answer shows the Bible reference and a short explanation.</p>' +
      '<div class="stats"><div class="stat"><b>' + S.best + '/10</b><span>Best score</span></div>' +
      '<div class="stat"><b>' + S.played + '</b><span>Quizzes</span></div>' +
      '<div class="stat"><b>' + (S.asked ? Math.round(100 * S.right / S.asked) : 0) + '%</b><span>Accuracy</span></div></div>' +
      '<div class="row"><button class="btn" id="start">Start Quiz</button></div></div>';
    document.getElementById('start').onclick = startQuiz;
  }
  function startQuiz() {
    var picks = shuffle(QUIZ).slice(0, 10).map(function (x) {
      var opts = shuffle([x.c].concat(x.w));
      return { q: x.q, opts: opts, a: opts.indexOf(x.c), ref: x.ref, e: x.e };
    });
    Q = { list: picks, i: 0, score: 0, done: false };
    renderQuestion();
  }
  function renderQuestion() {
    var x = Q.list[Q.i];
    $app.innerHTML =
      '<div class="card"><div class="bar"><i style="width:' + (Q.i / Q.list.length * 100) + '%"></i></div>' +
      '<span class="label">Question ' + (Q.i + 1) + ' / ' + Q.list.length + ' · Score ' + Q.score + '</span>' +
      '<h2 style="font-size:1.15rem;color:var(--ink)">' + esc(x.q) + '</h2>' +
      x.opts.map(function (o, k) { return '<button class="opt" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') +
      '<div id="fb"></div></div>';
    var btns = $app.querySelectorAll('.opt');
    btns.forEach(function (b) {
      b.onclick = function () {
        var k = +b.getAttribute('data-k');
        S.asked++;
        if (k === x.a) { Q.score++; S.right++; b.classList.add('ok'); } else { b.classList.add('bad'); btns[x.a].classList.add('ok'); }
        btns.forEach(function (z) { z.disabled = true; });
        document.getElementById('fb').innerHTML =
          '<div class="explain"><b>' + (k === x.a ? '✓ సరైన జవాబు' : '✗ సరైన జవాబు: ' + esc(x.opts[x.a])) + '</b><br>' + esc(x.e) +
          '<div class="ref">' + esc(x.ref) + '</div></div>' +
          '<div class="row"><button class="btn" id="nx">' + (Q.i === Q.list.length - 1 ? 'See result' : 'Next question →') + '</button></div>';
        document.getElementById('nx').onclick = function () { Q.i++; if (Q.i >= Q.list.length) finish(); else renderQuestion(); };
        save();
      };
    });
  }
  function finish() {
    S.played++; if (Q.score > S.best) S.best = Q.score; save();
    var s = Q.score, msg = s >= 9 ? 'అద్భుతము! 🎉' : s >= 6 ? 'చాలా బాగుంది! 👏' : 'మరల ప్రయత్నించుడి 🙏';
    $app.innerHTML =
      '<div class="card"><span class="label">Result</span><div class="big">' + s + ' / ' + Q.list.length + '</div>' +
      '<p style="text-align:center;font-size:1.1rem">' + msg + '</p>' +
      '<div class="row" style="justify-content:center"><button class="btn" id="again">Play again</button>' +
      '<button class="btn alt" id="home">Back</button></div></div>';
    document.getElementById('again').onclick = startQuiz;
    document.getElementById('home').onclick = renderQuizHome;
  }

  // ---------- Saved ----------
  function renderSaved() {
    var html = '<div class="card"><span class="label">Saved devotions</span>';
    if (!S.favs.length) html += '<p>ఇంకా ఏమీ సేవ్ చేయలేదు. No saved items yet — tap ☆ on a devotion to save it.</p>';
    else html += S.favs.map(function (i) { return '<div class="item" data-i="' + i + '"><b>' + esc(DEVOS[i].t) + '</b><div class="ref">' + esc(DEVOS[i].ref) + '</div></div>'; }).join('');
    $app.innerHTML = html + '</div>';
    $app.querySelectorAll('.item').forEach(function (el) {
      el.onclick = function () {
        var i = +el.getAttribute('data-i');
        var cur = ((todayNum % DEVOS.length) + DEVOS.length) % DEVOS.length;
        viewOffset = ((i - cur) % DEVOS.length + DEVOS.length) % DEVOS.length;
        setTab('today');
      };
    });
  }

  // ---------- Progress ----------
  function renderMe() {
    $app.innerHTML =
      '<div class="card"><span class="label">Your progress</span><h2>నా ప్రగతి</h2>' +
      '<div class="stats"><div class="stat"><b>' + streak() + '</b><span>Day streak</span></div>' +
      '<div class="stat"><b>' + S.best + '/10</b><span>Best quiz</span></div>' +
      '<div class="stat"><b>' + S.favs.length + '</b><span>Saved</span></div></div>' +
      '<div class="stats" style="margin-top:10px"><div class="stat"><b>' + S.played + '</b><span>Quizzes played</span></div>' +
      '<div class="stat"><b>' + S.right + '</b><span>Correct answers</span></div>' +
      '<div class="stat"><b>' + S.days.length + '</b><span>Days visited</span></div></div>' +
      '<div class="row"><button class="btn alt" id="reset">Reset progress</button></div></div>' +
      '<div class="card"><span class="label">Install</span><p style="margin:.3rem 0 0">Chrome menu (⋮) → <b>Add to Home screen</b> / <b>Install app</b>. Works offline after the first load.</p></div>';
    document.getElementById('reset').onclick = function () {
      if (confirm('Reset all progress and saved items?')) { S = { favs: [], days: [ts], played: 0, best: 0, right: 0, asked: 0 }; save(); renderMe(); }
    };
  }

  // ---------- Tabs ----------
  function setTab(t) {
    document.querySelectorAll('nav button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); });
    if (t === 'today') renderToday();
    else if (t === 'quiz') renderQuizHome();
    else if (t === 'saved') renderSaved();
    else renderMe();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('nav button').forEach(function (b) {
    b.onclick = function () { if (b.getAttribute('data-tab') !== 'today') viewOffset = 0; setTab(b.getAttribute('data-tab')); };
  });
  setTab('today');

  if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); }); }
})();
