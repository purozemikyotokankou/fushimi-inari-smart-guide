/* Fushimi Meta Map — Liquid Glass cursor v90
   Shared cursor controller for index.html, home.html and planner.html.
   Performance: no permanent RAF loop; pointer movement is coalesced to one update/frame.
*/
(() => {
  "use strict";

  const cursor = document.querySelector(".liquid-cursor");
  const finePointer = window.matchMedia("(any-pointer: fine)");
  if (!cursor || !finePointer.matches) return;

  const POSITION_KEY = "fushimiMetaMapLiquidCursorPositionV90";
  const interactiveSelector = [
    "a", "button", "select", "input", "textarea", "[role='button']",
    ".leaflet-control", ".leaflet-marker-icon", ".leaflet-interactive"
  ].join(",");
  const interactiveFor = target => target instanceof Element ? target.closest(interactiveSelector) : null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let pointerX = null;
  let pointerY = null;
  let pendingX = null;
  let pendingY = null;
  let scheduledFrame = 0;
  let hoverTarget = null;

  function applyPosition(x, y) {
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }

  function rememberPosition(x, y) {
    try {
      sessionStorage.setItem(POSITION_KEY, JSON.stringify({ x, y, at: Date.now() }));
    } catch (_) {
      // Private browsing/storage-disabled environments can still use the live cursor.
    }
  }

  function restorePosition() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(POSITION_KEY) || "null");
      if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
      // A stale position from a very different viewport should not put the cursor off-screen.
      if (saved.x < 0 || saved.y < 0 || saved.x > window.innerWidth || saved.y > window.innerHeight) return;
      pointerX = saved.x;
      pointerY = saved.y;
      applyPosition(pointerX, pointerY);
      cursor.classList.add("is-visible");
    } catch (_) {
      // Ignore malformed/stale session data.
    }
  }

  function updateHover(target) {
    const next = interactiveFor(target);
    if (next === hoverTarget) return;
    hoverTarget = next;
    cursor.classList.toggle("is-hover", Boolean(next));
  }

  function flushPosition() {
    scheduledFrame = 0;
    if (pendingX === null || pendingY === null) return;
    pointerX = pendingX;
    pointerY = pendingY;
    applyPosition(pointerX, pointerY);
  }

  function onPointerMove(event) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    pendingX = event.clientX;
    pendingY = event.clientY;
    if (!cursor.classList.contains("is-visible")) cursor.classList.add("is-visible");
    updateHover(event.target);
    if (!scheduledFrame) scheduledFrame = window.requestAnimationFrame(flushPosition);
  }

  function createRipple(x, y) {
    if (reduceMotion) return;
    const ripples = document.querySelectorAll(".cursor-ripple");
    // Guard against a rapid series of clicks leaving too many animated nodes at once.
    if (ripples.length >= 4) ripples[0].remove();
    const ripple = document.createElement("span");
    ripple.className = "cursor-ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }

  // A click before normal pointer movement (e.g. tapping a header item) stores the last
  // position so the custom cursor can reappear immediately after the page navigates.
  document.addEventListener("pointerdown", event => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    pendingX = pointerX;
    pendingY = pointerY;
    applyPosition(pointerX, pointerY);
    cursor.classList.add("is-visible", "is-down");
    rememberPosition(pointerX, pointerY);
    createRipple(pointerX, pointerY);
    if (!scheduledFrame) scheduledFrame = window.requestAnimationFrame(flushPosition);
  }, { passive: true });

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerover", event => updateHover(event.target), { passive: true });
  document.addEventListener("pointerout", event => {
    // Keep hover state when moving among nested spans/icons inside the same control.
    const from = interactiveFor(event.target);
    const to = interactiveFor(event.relatedTarget);
    if (from !== to) {
      hoverTarget = to;
      cursor.classList.toggle("is-hover", Boolean(to));
    }
  }, { passive: true });

  document.addEventListener("pointerup", () => cursor.classList.remove("is-down"), { passive: true });
  document.addEventListener("pointercancel", () => cursor.classList.remove("is-down"), { passive: true });
  document.addEventListener("pointerleave", event => {
    if (!event.pointerType || event.pointerType === "mouse") cursor.classList.remove("is-visible");
  });
  document.addEventListener("pointerenter", event => {
    if ((!event.pointerType || event.pointerType === "mouse") && pointerX !== null && pointerY !== null) {
      cursor.classList.add("is-visible");
    }
  });

  restorePosition();
})();
