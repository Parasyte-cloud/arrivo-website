(() => {
  "use strict";

  const PROD_START =
    Date.parse(
      "2026-09-12T13:00:00+01:00"
    );

  const PROD_LAUNCH =
    Date.parse(
      "2026-09-12T14:00:00+01:00"
    );

  const params =
    new URLSearchParams(
      location.search
    );

  const TEST =
    params.get("launchTest") === "1";

  let startTime =
    PROD_START;

  let launchTime =
    PROD_LAUNCH;

  let serverOffset = 0;
  let launched = false;
  let closed = false;
  let previousFinal = null;

  const clock = () =>
    Date.now() + serverOffset;

  const pad = number =>
    String(number)
      .padStart(2, "0");

  if (TEST) {
    const now =
      Date.now();

    startTime =
      now;

    launchTime =
      now + 20000;
  }

  function createGate() {
    const gate =
      document.createElement("div");

    gate.id =
      "ra-launch-gate";

    gate.dataset.phase =
      "pre";

    gate.setAttribute(
      "role",
      "dialog"
    );

    gate.setAttribute(
      "aria-modal",
      "true"
    );

    gate.innerHTML = `
      <div
        class="ra-grid"
        aria-hidden="true"
      ></div>

      <div
        class="ra-orb ra-orb-1"
        aria-hidden="true"
      ></div>

      <div
        class="ra-orb ra-orb-2"
        aria-hidden="true"
      ></div>

      <canvas
        id="ra-celebration-canvas"
        aria-hidden="true"
      ></canvas>

      ${
        TEST
          ? `
            <div class="ra-test">
              20-second test
            </div>
          `
          : ""
      }

      <div class="ra-content">

        <div class="ra-logo-wrap">

          <img
            id="ra-launch-logo"
            class="ra-logo"
            src="/assets/ridearrivo-wordmark-light.png"
            alt="RideArrivo"
          >

          <div
            id="ra-logo-fallback"
            class="ra-logo-fallback"
          >
            <span class="ride">
              Ride
            </span><span class="arrivo">
              Arrivo
            </span>
          </div>

        </div>

        <section
          class="ra-standard"
        >
          <p
            id="ra-eyebrow"
            class="ra-eyebrow"
          >
            Official Launch
          </p>

          <h1
            id="ra-title"
            class="ra-title"
          >
            Something new
            is arriving.
          </h1>

          <p
            id="ra-copy"
            class="ra-copy"
          >
            RideArrivo officially
            launches today.
          </p>

          <div
            class="ra-line"
          ></div>

          <div
            class="ra-timer"
            aria-live="polite"
          >

            <div>
              <span
                id="ra-hours"
                class="ra-value"
              >
                00
              </span>

              <span
                class="ra-label"
              >
                Hours
              </span>
            </div>

            <div class="ra-colon">
              :
            </div>

            <div>
              <span
                id="ra-minutes"
                class="ra-value"
              >
                00
              </span>

              <span
                class="ra-label"
              >
                Minutes
              </span>
            </div>

            <div class="ra-colon">
              :
            </div>

            <div>
              <span
                id="ra-seconds"
                class="ra-value"
              >
                00
              </span>

              <span
                class="ra-label"
              >
                Seconds
              </span>
            </div>

          </div>

          <div class="ra-tagline">
            Land in Lagos.
            Arrive. Relax.
          </div>

          <div class="ra-zone">
            West Africa Time · Lagos
          </div>

        </section>

        <section
          class="ra-final"
          aria-live="assertive"
        >
          <p class="ra-eyebrow">
            RideArrivo goes live in
          </p>

          <div id="ra-final-number">
            10
          </div>
        </section>

        <section
          class="ra-live"
          aria-live="assertive"
        >

          <div class="ra-live-pill">
            We are live
          </div>

          <h1 class="ra-live-title">
            Welcome to
            <br>
            <span>RideArrivo.</span>
          </h1>

          <p class="ra-live-copy">
            A more trusted way
            to arrive in Lagos
            starts now.
            <br>
            Land in Lagos.
            Arrive. Relax.
          </p>

          <button
            id="ra-enter"
            type="button"
          >
            Enter RideArrivo
          </button>

        </section>

      </div>
    `;

    document.body.prepend(
      gate
    );

    document.documentElement
      .classList
      .remove(
        "ra-launch-pending"
      );

    document.documentElement
      .classList
      .add(
        "ra-launch-locked"
      );

    const logo =
      document.getElementById(
        "ra-launch-logo"
      );

    const fallback =
      document.getElementById(
        "ra-logo-fallback"
      );

    logo.addEventListener(
      "error",
      () => {
        logo.style.display =
          "none";

        fallback.style.display =
          "block";
      }
    );

    document.getElementById(
      "ra-enter"
    ).addEventListener(
      "click",
      closeGate
    );

    return gate;
  }

  function closeGate() {
    if (closed) {
      return;
    }

    closed = true;

    const gate =
      document.getElementById(
        "ra-launch-gate"
      );

    document.documentElement
      .classList
      .remove(
        "ra-launch-locked"
      );

    if (!gate) {
      return;
    }

    gate.classList.add(
      "ra-exit"
    );

    setTimeout(
      () => gate.remove(),
      900
    );
  }

  async function syncClock() {
    if (TEST) {
      return;
    }

    try {
      const target =
        location.pathname +
        "?__ra_clock=" +
        Date.now();

      const response =
        await fetch(
          target,
          {
            method: "HEAD",
            cache: "no-store",
            credentials:
              "same-origin"
          }
        );

      const value =
        response.headers.get(
          "date"
        );

      if (!value) {
        return;
      }

      const server =
        Date.parse(value);

      if (
        Number.isFinite(server)
      ) {
        serverOffset =
          server - Date.now();
      }

    } catch (_) {
      /*
       * Browser clock remains
       * the safe fallback.
       */
    }
  }

  function showPre(gate) {
    gate.dataset.phase =
      "pre";

    document.getElementById(
      "ra-eyebrow"
    ).textContent =
      "Official Launch · 12 September 2026";

    document.getElementById(
      "ra-title"
    ).innerHTML =
      "Something new<br>is arriving.";

    document.getElementById(
      "ra-copy"
    ).innerHTML =
      "The official RideArrivo countdown begins at " +
      "<strong style='color:#fff'>1:00 PM WAT</strong>." +
      "<br>We go live at " +
      "<strong style='color:#f2a93b'>2:00 PM</strong>.";
  }

  function showTimer(
    gate,
    remaining
  ) {
    gate.dataset.phase =
      "countdown";

    document.getElementById(
      "ra-eyebrow"
    ).textContent =
      "RideArrivo Official Launch";

    document.getElementById(
      "ra-title"
    ).innerHTML =
      "We go live at " +
      "<span class='accent'>" +
      "2:00 PM." +
      "</span>";

    document.getElementById(
      "ra-copy"
    ).textContent =
      "The next chapter of trusted mobility begins in Lagos.";

    const total =
      Math.max(
        0,
        Math.ceil(
          remaining / 1000
        )
      );

    const hours =
      Math.floor(
        total / 3600
      );

    const minutes =
      Math.floor(
        (total % 3600) /
        60
      );

    const seconds =
      total % 60;

    document.getElementById(
      "ra-hours"
    ).textContent =
      pad(hours);

    document.getElementById(
      "ra-minutes"
    ).textContent =
      pad(minutes);

    document.getElementById(
      "ra-seconds"
    ).textContent =
      pad(seconds);
  }

  function showFinal(
    gate,
    remaining
  ) {
    gate.dataset.phase =
      "final";

    const second =
      Math.max(
        1,
        Math.ceil(
          remaining / 1000
        )
      );

    if (
      second ===
      previousFinal
    ) {
      return;
    }

    previousFinal =
      second;

    const number =
      document.getElementById(
        "ra-final-number"
      );

    number.textContent =
      String(second);

    number.style.animation =
      "none";

    void number.offsetHeight;

    number.style.animation =
      "";
  }

  function createCelebration() {
    const canvas =
      document.getElementById(
        "ra-celebration-canvas"
      );

    const context =
      canvas.getContext("2d");

    const particles = [];

    const colours = [
      "#ff9200",
      "#f2a93b",
      "#ffffff",
      "#dbe7ef",
      "#7fc4e8"
    ];

    let width = 0;
    let height = 0;
    let dpr = 1;
    let active = false;

    function resize() {
      width =
        innerWidth;

      height =
        innerHeight;

      dpr =
        Math.min(
          devicePixelRatio || 1,
          2
        );

      canvas.width =
        Math.floor(
          width * dpr
        );

      canvas.height =
        Math.floor(
          height * dpr
        );

      canvas.style.width =
        width + "px";

      canvas.style.height =
        height + "px";

      context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );
    }

    function particle(
      x,
      y,
      power
    ) {
      const angle =
        Math.random() *
        Math.PI *
        2;

      const speed =
        (
          4 +
          Math.random() *
          11
        ) * power;

      return {
        x,
        y,

        vx:
          Math.cos(angle) *
          speed,

        vy:
          Math.sin(angle) *
          speed -
          Math.random() * 5,

        gravity:
          .13 +
          Math.random() *
          .10,

        drag: .982,

        age: 0,

        life:
          70 +
          Math.random() *
          60,

        size:
          3 +
          Math.random() *
          7,

        rotation:
          Math.random() *
          Math.PI,

        spin:
          (
            Math.random() -
            .5
          ) * .28,

        colour:
          colours[
            Math.floor(
              Math.random() *
              colours.length
            )
          ]
      };
    }

    function burst(
      x,
      y,
      count,
      power = 1
    ) {
      for (
        let i = 0;
        i < count;
        i += 1
      ) {
        particles.push(
          particle(
            x,
            y,
            power
          )
        );
      }

      if (!active) {
        active = true;
        requestAnimationFrame(
          render
        );
      }
    }

    function render() {
      context.clearRect(
        0,
        0,
        width,
        height
      );

      for (
        let index =
          particles.length - 1;

        index >= 0;

        index -= 1
      ) {
        const p =
          particles[index];

        p.age += 1;

        p.vx *= p.drag;
        p.vy *= p.drag;

        p.vy += p.gravity;

        p.x += p.vx;
        p.y += p.vy;

        p.rotation +=
          p.spin;

        const alpha =
          Math.max(
            0,
            1 -
            p.age / p.life
          );

        context.save();

        context.globalAlpha =
          alpha;

        context.translate(
          p.x,
          p.y
        );

        context.rotate(
          p.rotation
        );

        context.fillStyle =
          p.colour;

        context.fillRect(
          -p.size / 2,
          -p.size / 2,
          p.size,
          p.size * .65
        );

        context.restore();

        if (
          p.age >= p.life
        ) {
          particles.splice(
            index,
            1
          );
        }
      }

      if (
        particles.length
      ) {
        requestAnimationFrame(
          render
        );
      } else {
        active = false;
      }
    }

    resize();

    addEventListener(
      "resize",
      resize,
      {
        passive: true
      }
    );

    return {
      burst,
      width: () => width,
      height: () => height
    };
  }

  function goLive(
    gate,
    fx
  ) {
    if (launched) {
      return;
    }

    launched = true;

    gate.dataset.phase =
      "live";

    const reduced =
      matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    if (!reduced) {
      const w =
        fx.width();

      const h =
        fx.height();

      fx.burst(
        w * .50,
        h * .48,
        150,
        1.3
      );

      setTimeout(
        () => {
          fx.burst(
            w * .18,
            h * .62,
            100,
            1.05
          );

          fx.burst(
            w * .82,
            h * .62,
            100,
            1.05
          );
        },
        320
      );

      setTimeout(
        () => {
          fx.burst(
            w * .30,
            h * .32,
            80,
            .95
          );

          fx.burst(
            w * .70,
            h * .32,
            80,
            .95
          );
        },
        850
      );

      setTimeout(
        () => {
          fx.burst(
            w * .50,
            h * .52,
            130,
            1.15
          );
        },
        1450
      );
    }

    setTimeout(
      closeGate,
      TEST
        ? 6200
        : 7000
    );
  }

  async function init() {
    /*
     * Build the gate immediately so
     * the underlying website cannot
     * flash on screen first.
     */
    const gate =
      createGate();

    const fx =
      createCelebration();

    await syncClock();

    /*
     * Anyone arriving after
     * 2:00 PM WAT simply receives
     * the normal RideArrivo site.
     */
    if (
      !TEST &&
      clock() >= launchTime
    ) {
      closeGate();
      return;
    }

    function tick() {
      if (closed) {
        return;
      }

      const current =
        clock();

      const remaining =
        launchTime -
        current;

      if (
        current >=
        launchTime
      ) {
        goLive(
          gate,
          fx
        );

        return;
      }

      if (
        remaining <=
        10000
      ) {
        showFinal(
          gate,
          remaining
        );
      }

      else if (
        current >=
        startTime
      ) {
        showTimer(
          gate,
          remaining
        );
      }

      else {
        showPre(
          gate
        );
      }

      setTimeout(
        tick,
        remaining <=
        11000
          ? 40
          : 250
      );
    }

    tick();
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );
  } else {
    init();
  }
})();
