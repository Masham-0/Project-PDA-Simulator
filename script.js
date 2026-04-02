document.addEventListener("DOMContentLoaded", () => {
  const themeBtn = document.getElementById("theme-toggle");
  const htmlTag = document.documentElement;

  themeBtn.addEventListener("click", () => {
    if (htmlTag.getAttribute("data-theme") === "light") {
      htmlTag.setAttribute("data-theme", "dark");
      themeBtn.innerHTML =
        '<i class="fas fa-sun"></i> <span class="theme-text">Light Mode</span>';
    } else {
      htmlTag.setAttribute("data-theme", "light");
      themeBtn.innerHTML =
        '<i class="fas fa-moon"></i> <span class="theme-text">Dark Mode</span>';
    }
  });

  // Scroll Spy Logic
  const sections = document.querySelectorAll(".section");
  const navItems = document.querySelectorAll(".nav-item");

  window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;

      if (pageYOffset >= sectionTop - sectionHeight / 3) {
        current = section.getAttribute("id");
      }
    });

    navItems.forEach((item) => {
      item.classList.remove("active");
      if (item.getAttribute("href") === `#${current}`) {
        item.classList.add("active");
      }
    });
  });

  // PDA Simulator Engine
  let pda = null;

  const dom = {
    states: document.getElementById("states"),
    start: document.getElementById("start-state"),
    accept: document.getElementById("accept-states"),
    rules: document.getElementById("transitions"),
    inputStr: document.getElementById("input-string"),
    btnLoad: document.getElementById("btn-load"),
    btnSimulate: document.getElementById("btn-simulate"),
    btnStep: document.getElementById("btn-step"),
    btnReset: document.getElementById("btn-reset"),
    dispState: document.getElementById("disp-state"),
    dispInput: document.getElementById("disp-input"),
    dispResult: document.getElementById("disp-result"),
    stackVisual: document.getElementById("stack-visual"),
    traceLog: document.getElementById("trace-log"),
  };

  dom.btnLoad.addEventListener("click", () => {
    dom.states.value = "q0, q1, q2";
    dom.start.value = "q0";
    dom.accept.value = "q2";
    dom.rules.value = `q0, a, Z -> q0, aZ
q0, a, a -> q0, aa
q0, b, a -> q1, e
q1, b, a -> q1, e
q1, e, Z -> q2, Z`;
    dom.inputStr.value = "aabb";
    log("Sample PDA loaded for language a^n b^n.");
  });

  function initPDA() {
    const acceptStates = dom.accept.value.split(",").map((s) => s.trim());
    const rulesRaw = dom.rules.value.split("\n");

    const transitions = {};

    rulesRaw.forEach((rule) => {
      if (!rule.includes("->")) return;

      const [lhs, rhs] = rule.split("->").map((s) => s.trim());
      const [state, input, stackTop] = lhs.split(",").map((s) => s.trim());
      const [nextState, pushStr] = rhs.split(",").map((s) => s.trim());

      const key = `${state}|${input}|${stackTop}`;
      transitions[key] = { nextState, pushStr };
    });

    pda = {
      currentState: dom.start.value.trim(),
      acceptStates,
      transitions,
      inputRemaining: dom.inputStr.value.trim(),
      stack: ["Z"],
      status: "Running",
    };

    dom.btnStep.disabled = false;
    dom.stackVisual.innerHTML = "";
    dom.traceLog.innerHTML = "";

    renderStack(pda.stack, []);
    updateDashboard();
    log("PDA Initialized. Stack initialized with 'Z'.");
  }

  function step() {
    if (!pda || pda.status !== "Running") return;

    const state = pda.currentState;
    const stackTop =
      pda.stack.length > 0 ? pda.stack[pda.stack.length - 1] : "e";
    const nextInput =
      pda.inputRemaining.length > 0 ? pda.inputRemaining[0] : "e";

    let ruleKey = `${state}|${nextInput}|${stackTop}`;
    let matchedInput = nextInput;

    if (!pda.transitions[ruleKey]) {
      ruleKey = `${state}|e|${stackTop}`;
      matchedInput = "e";
    }

    if (pda.transitions[ruleKey]) {
      const rule = pda.transitions[ruleKey];
      const oldStack = [...pda.stack];

      pda.currentState = rule.nextState;

      if (matchedInput !== "e") {
        pda.inputRemaining = pda.inputRemaining.substring(1);
      }

      pda.stack.pop();

      if (rule.pushStr !== "e") {
        for (let i = rule.pushStr.length - 1; i >= 0; i--) {
          pda.stack.push(rule.pushStr[i]);
        }
      }

      log(
        `Transition: δ(${state}, ${matchedInput}, ${stackTop}) -> (${rule.nextState}, ${rule.pushStr})`,
      );
      renderStack(pda.stack, oldStack);

      checkAcceptance();
      updateDashboard();
    } else {
      pda.status = "Rejected";
      log(
        `CRASH: No valid transition for State=${state}, Input=${nextInput}, StackTop=${stackTop}`,
      );
      updateDashboard();
      dom.btnStep.disabled = true;
    }
  }

  function checkAcceptance() {
    const state = pda.currentState;
    const stackTop = pda.stack[pda.stack.length - 1] || "e";

    const epsilonMoveExists = pda.transitions[`${state}|e|${stackTop}`];

    if (pda.inputRemaining.length === 0 && !epsilonMoveExists) {
      if (pda.acceptStates.includes(state)) {
        pda.status = "Accepted";
        log(`Halt: String Accepted in state ${state}`);
      } else {
        pda.status = "Rejected";
        log(`Halt: String Rejected in state ${state}`);
      }

      dom.btnStep.disabled = true;
    }
  }

  function updateDashboard() {
    dom.dispState.innerText = pda.currentState;
    dom.dispInput.innerText =
      pda.inputRemaining === "" ? "ε (Empty)" : pda.inputRemaining;

    const resEl = dom.dispResult;

    if (pda.status === "Running") {
      resEl.innerText = "Processing...";
      resEl.className = "neutral";
    } else if (pda.status === "Accepted") {
      resEl.innerText = "Accepted";
      resEl.className = "success";
    } else {
      resEl.innerText = "Rejected";
      resEl.className = "error";
    }
  }

  function renderStack(newStack, oldStack) {
    const visual = dom.stackVisual;

    if (oldStack.length > newStack.length && visual.firstChild) {
      const topEl = visual.firstChild;
      topEl.classList.add("pop");

      setTimeout(() => {
        drawFullStack(newStack);
      }, 300);
      return;
    }

    drawFullStack(newStack);
  }

  function drawFullStack(stackArray) {
    const visual = dom.stackVisual;
    visual.innerHTML = "";

    [...stackArray].reverse().forEach((symbol) => {
      const el = document.createElement("div");
      el.className = "stack-item";
      el.innerText = symbol;
      visual.appendChild(el);
    });
  }

  function log(message) {
    const li = document.createElement("li");
    li.innerText = message;
    dom.traceLog.appendChild(li);
    dom.traceLog.scrollTop = dom.traceLog.scrollHeight;
  }

  dom.btnSimulate.addEventListener("click", () => {
    initPDA();

    const interval = setInterval(() => {
      if (pda.status !== "Running") {
        clearInterval(interval);
      } else {
        step();
      }
    }, 800);
  });

  dom.btnStep.addEventListener("click", () => {
    if (!pda) initPDA();
    step();
  });

  dom.btnReset.addEventListener("click", () => {
    pda = null;
    dom.dispState.innerText = "-";
    dom.dispInput.innerText = "-";
    dom.dispResult.innerText = "Waiting...";
    dom.dispResult.className = "neutral";
    dom.stackVisual.innerHTML = "";
    dom.traceLog.innerHTML = "<li>Initialize PDA to begin trace.</li>";
    dom.btnStep.disabled = true;
  });
});
