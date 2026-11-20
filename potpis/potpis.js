// Kopira potpis kao formatiran tekst (HTML), da se u Gmail nalepi sa logoom i bojama.
document.querySelectorAll("[data-copy]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var box = document.getElementById(btn.getAttribute("data-copy"));
    var msg = btn.parentNode.querySelector(".ok");
    var done = function () { msg.textContent = btn.textContent.indexOf("Copy") === 0 ? "Copied. Paste it in Gmail." : "Kopirano. Nalepi u Gmail."; };
    var fallback = function () {
      var r = document.createRange(); r.selectNodeContents(box);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      if (ok) { s.removeAllRanges(); done(); } else msg.textContent = "Potpis je označen: pritisni Ctrl+C.";
    };
    try {
      if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        var item = new ClipboardItem({
          "text/html": new Blob([box.innerHTML], { type: "text/html" }),
          "text/plain": new Blob([box.innerText], { type: "text/plain" })
        });
        navigator.clipboard.write([item]).then(done, fallback);
      } else fallback();
    } catch (e) { fallback(); }
  });
});
