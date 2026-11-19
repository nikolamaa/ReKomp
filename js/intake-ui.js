// Prikaz upitnika: korak po korak, pa pregled. Isti prikaz služi i za kasnije izmene.
import { esc, debounce, qsa } from "./util.js";
import { t, getLang } from "./i18n.js";
import { SECTIONS, tx, fieldVisible, sectionAnswered, missingRequired } from "./intake.js";

function fieldHtml(f, v, lang) {
  var id = "q-" + f.id;
  var req = f.required ? ' <span class="req">*</span>' : "";
  var label = '<label class="q-label" for="' + id + '">' + esc(tx(f.label, lang)) + req + "</label>";
  var help = f.help ? '<p class="q-help">' + esc(tx(f.help, lang)) + "</p>" : "";
  var body = "";
  if (f.type === "text") body = '<input id="' + id + '" data-q="' + f.id + '" type="text" value="' + esc(v || "") + '">';
  else if (f.type === "textarea") body = '<textarea id="' + id + '" data-q="' + f.id + '" rows="3">' + esc(v || "") + "</textarea>";
  else if (f.type === "date") body = '<input id="' + id + '" data-q="' + f.id + '" type="date" value="' + esc(v || "") + '">';
  else if (f.type === "number") body = '<div class="num-wrap"><input id="' + id + '" data-q="' + f.id + '" data-num="1" inputmode="decimal" value="' + esc(v == null ? "" : String(v).replace(".", lang === "en" ? "." : ",")) + '">' + (f.unit ? '<span class="unit">' + esc(f.unit) + "</span>" : "") + "</div>";
  else if (f.type === "check") {
    return '<div class="q q-check" data-field="' + f.id + '"><label class="checkrow"><input type="checkbox" id="' + id + '" data-q="' + f.id + '"' + (v ? " checked" : "") + '><span>' + esc(tx(f.label, lang)) + req + "</span></label></div>";
  } else if (f.type === "single" || f.type === "yesno") {
    var opts = f.type === "yesno" ? [{ v: "yes", sr: "Da", en: "Yes", ru: "Да" }, { v: "no", sr: "Ne", en: "No", ru: "Нет" }] : f.options;
    body = '<div class="pills" role="radiogroup" aria-labelledby="' + id + '-l">' + opts.map(function (o, i) {
      return '<label class="pill-opt"><input type="radio" name="' + id + '" data-q="' + f.id + '" value="' + esc(o.v) + '"' + (v === o.v ? " checked" : "") + (i === 0 ? ' id="' + id + '"' : "") + '><span>' + esc(o[lang] || o.sr) + "</span></label>";
    }).join("") + "</div>";
    label = '<span class="q-label" id="' + id + '-l">' + esc(tx(f.label, lang)) + req + "</span>";
  } else if (f.type === "multi") {
    var arr = Array.isArray(v) ? v : [];
    body = '<div class="pills" role="group" aria-labelledby="' + id + '-l">' + f.options.map(function (o) {
      return '<label class="pill-opt"><input type="checkbox" data-q="' + f.id + '" value="' + esc(o.v) + '"' + (arr.indexOf(o.v) >= 0 ? " checked" : "") + '><span>' + esc(o[lang] || o.sr) + "</span></label>";
    }).join("") + "</div>";
    label = '<span class="q-label" id="' + id + '-l">' + esc(tx(f.label, lang)) + req + "</span>";
  } else if (f.type === "scale") {
    var b = "";
    for (var n = f.min; n <= f.max; n++) b += '<label class="scale-opt"><input type="radio" name="' + id + '" data-q="' + f.id + '" value="' + n + '"' + (Number(v) === n && v !== "" && v != null ? " checked" : "") + '><span>' + n + "</span></label>";
    body = '<div class="scale" style="grid-template-columns:repeat(' + (f.max - f.min + 1) + ',minmax(0,1fr))" role="radiogroup" aria-labelledby="' + id + '-l">' + b + "</div>" + (f.ends ? '<p class="q-help">' + esc(tx(f.ends, lang)) + "</p>" : "");
    label = '<span class="q-label" id="' + id + '-l">' + esc(tx(f.label, lang)) + req + "</span>";
  }
  return '<div class="q" data-field="' + f.id + '">' + label + help + body + "</div>";
}

function readField(root, f) {
  var els = qsa('[data-q="' + f.id + '"]', root);
  if (!els.length) return undefined;
  if (f.type === "check") return els[0].checked;
  if (f.type === "multi") return els.filter(function (e) { return e.checked; }).map(function (e) { return e.value; });
  if (f.type === "single" || f.type === "yesno") { var c = els.filter(function (e) { return e.checked; })[0]; return c ? c.value : ""; }
  if (f.type === "scale") { var s = els.filter(function (e) { return e.checked; })[0]; return s ? Number(s.value) : null; }
  if (f.type === "number") { var raw = els[0].value.trim().replace(",", "."); if (raw === "") return null; var n = Number(raw); return isFinite(n) ? n : raw; }
  return els[0].value;
}

// opts: { answers, progress, submitted, onSave(answers, progress) -> Promise, onSubmit() -> Promise, onDone(), startAt }
export function mountIntake(root, opts) {
  var lang = getLang();
  var answers = Object.assign({}, opts.answers || {});
  var progress = Object.assign({}, opts.progress || {});
  var submitted = !!opts.submitted;
  var step = opts.startAt != null ? opts.startAt : (submitted ? SECTIONS.length : firstOpen());
  var editingFromReview = submitted;
  var statusEl = null;

  function firstOpen() {
    for (var i = 0; i < SECTIONS.length; i++) if (!progress[SECTIONS[i].id]) return i;
    return SECTIONS.length;
  }
  var save = debounce(function () {
    if (statusEl) statusEl.textContent = t("saving");
    Promise.resolve(opts.onSave(answers, progress)).then(function () {
      if (statusEl) statusEl.textContent = t("saved");
    }, function () { if (statusEl) statusEl.textContent = t("not_saved"); });
  }, 700);

  function sectionStatus(s) {
    if (progress[s.id] === "skipped" && !sectionAnswered(s, answers)) return "skipped";
    if (sectionAnswered(s, answers)) return "done";
    return progress[s.id] === "skipped" ? "skipped" : "none";
  }

  function render() {
    if (step >= SECTIONS.length) return renderReview();
    var s = SECTIONS[step];
    var html = '<div class="card intake">' +
      '<div class="intake-top"><span class="label">' + esc(t("step_of", { n: step + 1, total: SECTIONS.length })) + '</span><span class="status" id="iqStatus" role="status"></span></div>' +
      '<div class="progressbar" aria-hidden="true"><span style="width:' + Math.round((step / SECTIONS.length) * 100) + '%"></span></div>' +
      "<h2>" + esc(tx(s.title, lang)) + "</h2>" +
      (step === 0 && !submitted ? '<p class="muted">' + esc(t("intake_intro")) + "</p>" : "") +
      (s.intro ? '<p class="muted">' + esc(tx(s.intro, lang)) + "</p>" : "") +
      '<form id="iqForm" class="q-list" autocomplete="off" novalidate>' + s.fields.map(function (f) { return fieldHtml(f, answers[f.id], lang); }).join("") + "</form>" +
      '<p id="iqErr" class="form-err" role="alert" hidden></p>' +
      '<div class="actions intake-actions">' +
      (step > 0 && !editingFromReview ? '<button type="button" class="btn ghost" id="iqBack">' + esc(t("back")) + "</button>" : "") +
      (editingFromReview ? '<button type="button" class="btn ghost" id="iqBack">' + esc(t("back")) + "</button>" : "") +
      '<button type="button" class="btn" id="iqNext">' + esc(editingFromReview ? t("save_changes") : t("next")) + "</button>" +
      (!s.required && !editingFromReview ? '<button type="button" class="linkbtn" id="iqSkip">' + esc(t("skip_section")) + "</button>" : "") +
      "</div></div>";
    root.innerHTML = html;
    statusEl = document.getElementById("iqStatus");
    var form = document.getElementById("iqForm");
    applyVisibility(s);
    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);
    function onChange(e) {
      var id = e.target && e.target.dataset ? e.target.dataset.q : null; if (!id) return;
      var f = s.fields.filter(function (x) { return x.id === id; })[0]; if (!f) return;
      if (f.type === "multi" && f.exclusive && e.type === "change") {
        var boxes = qsa('[data-q="' + f.id + '"]', form);
        if (e.target.value === f.exclusive && e.target.checked) boxes.forEach(function (b) { if (b.value !== f.exclusive) b.checked = false; });
        else if (e.target.checked) boxes.forEach(function (b) { if (b.value === f.exclusive) b.checked = false; });
      }
      answers[f.id] = readField(form, f);
      applyVisibility(s);
      save();
    }
    var back = document.getElementById("iqBack");
    if (back) back.addEventListener("click", function () { save.flush(); step = editingFromReview ? SECTIONS.length : step - 1; render(); window.scrollTo(0, 0); });
    document.getElementById("iqNext").addEventListener("click", function () {
      var miss = missingRequired(s, answers), msg = "required_missing";
      if (!miss.length) { miss = badNumbers(s, answers); msg = "num_invalid"; }
      if (miss.length) {
        var e = document.getElementById("iqErr"); e.textContent = t(msg); e.hidden = false;
        var first = form.querySelector('[data-field="' + miss[0].id + '"]'); if (first) first.scrollIntoView({ block: "center" });
        miss.forEach(function (m) { var el = form.querySelector('[data-field="' + m.id + '"]'); if (el) el.classList.add("q-missing"); });
        return;
      }
      progress[s.id] = "done";
      save(); save.flush();
      step = editingFromReview ? SECTIONS.length : step + 1;
      render(); window.scrollTo(0, 0);
    });
    var skip = document.getElementById("iqSkip");
    if (skip) skip.addEventListener("click", function () { progress[s.id] = "skipped"; save(); save.flush(); step += 1; render(); window.scrollTo(0, 0); });
  }

  // Brojevi: mora biti broj, u razumnom opsegu ako je zadat (npr. visina 120–230 cm).
  function badNumbers(s, a) {
    return s.fields.filter(function (f) {
      if (f.type !== "number" || !fieldVisible(f, a)) return false;
      var v = a[f.id];
      if (v == null || v === "") return false;
      if (typeof v !== "number") return true;
      return (f.min != null && v < f.min) || (f.max != null && v > f.max);
    });
  }

  function applyVisibility(s) {
    s.fields.forEach(function (f) {
      var el = root.querySelector('[data-field="' + f.id + '"]');
      if (el) el.hidden = !fieldVisible(f, answers);
      if (el && el.classList.contains("q-missing") && missingRequired({ fields: [f] }, answers).length === 0 && badNumbers({ fields: [f] }, answers).length === 0) el.classList.remove("q-missing");
    });
  }

  function renderReview() {
    var rows = SECTIONS.map(function (s, i) {
      var st = sectionStatus(s);
      var label = st === "done" ? t("filled") : (st === "skipped" ? t("skipped") : t("not_started"));
      return '<li><span class="rv-name">' + esc(tx(s.title, lang)) + '</span><span class="badge ' + (st === "done" ? "ok" : (st === "skipped" ? "warnb" : "")) + '">' + esc(label) + '</span><button type="button" class="btn ghost small" data-edit="' + i + '">' + esc(t("edit")) + "</button></li>";
    }).join("");
    root.innerHTML = '<div class="card intake">' +
      "<h2>" + esc(submitted ? t("my_answers") : t("review_title")) + "</h2>" +
      '<p class="muted">' + esc(submitted ? t("answers_edit_hint") : t("review_text")) + "</p>" +
      '<ul class="review-list">' + rows + "</ul>" +
      '<p id="iqErr" class="form-err" role="alert" hidden></p>' +
      '<div class="actions">' + (submitted ? '<button type="button" class="btn" id="iqDone">' + esc(t("close")) + "</button>" : '<button type="button" class="btn" id="iqSubmit">' + esc(t("submit")) + "</button>") +
      '<span class="status" id="iqStatus" role="status"></span></div></div>';
    statusEl = document.getElementById("iqStatus");
    qsa("[data-edit]", root).forEach(function (b) {
      b.addEventListener("click", function () { editingFromReview = true; step = Number(b.dataset.edit); render(); window.scrollTo(0, 0); });
    });
    var sub = document.getElementById("iqSubmit");
    if (sub) sub.addEventListener("click", async function () {
      var consent = SECTIONS[0];
      if (missingRequired(consent, answers).length) { editingFromReview = true; step = 0; render(); return; }
      var missingAny = SECTIONS.filter(function (s) { return missingRequired(s, answers).length && sectionStatus(s) === "done"; });
      if (missingAny.length) { editingFromReview = true; step = SECTIONS.indexOf(missingAny[0]); render(); return; }
      sub.disabled = true; statusEl.textContent = t("saving");
      try { save.flush(); await opts.onSave(answers, progress); await opts.onSubmit(); }
      catch (e) { statusEl.textContent = t("not_saved"); sub.disabled = false; }
    });
    var done = document.getElementById("iqDone");
    if (done) done.addEventListener("click", function () { save.flush(); if (opts.onDone) opts.onDone(); });
  }

  render();
  return { flush: function () { save.flush(); } };
}
