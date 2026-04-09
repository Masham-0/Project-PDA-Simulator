document.addEventListener("DOMContentLoaded", () => {
  const dom = {
    states: document.getElementById("states"),
    start: document.getElementById("start-state"),
    accept: document.getElementById("accept-states"),
    rules: document.getElementById("transitions"),
    inputStr: document.getElementById("input-string"),
    btnLoad1: document.getElementById("btn-load-1"),
    btnLoad2: document.getElementById("btn-load-2"),
    btnSimulate: document.getElementById("btn-simulate"),
    btnStep: document.getElementById("btn-step"),
    btnBack: document.getElementById("btn-step-back"),
    btnReset: document.getElementById("btn-reset"),
    dispState: document.getElementById("disp-state"),
    dispInput: document.getElementById("disp-input"),
    dispResult: document.getElementById("disp-result"),
    stackVisual: document.getElementById("stack-visual"),
    traceLog: document.getElementById("trace-log"),
    graphContainer: document.getElementById("pda-graph"),
  };

  let pda = null;
  let history = [];
  let network = null;
  let nodes = new vis.DataSet();
  let edges = new vis.DataSet();
  let simTimer = null;

  const themeBtn = document.getElementById("theme-toggle");
  const themeIcon = themeBtn?.querySelector("i");
  const themeText = themeBtn?.querySelector(".theme-text");

  function stopSimulationTimer() {
    if (simTimer) {
      clearInterval(simTimer);
      simTimer = null;
    }
  }

  function getStackMode() {
    const checked = document.querySelector('input[name="stack-init"]:checked');
    return checked ? checked.value : "Z";
  }

  function setStackMode(mode) {
    const target = document.querySelector(
      `input[name="stack-init"][value="${mode}"]`,
    );
    if (target) target.checked = true;
  }

  function parseList(value) {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function parseRuleLine(rule) {
    if (!rule || !rule.includes("->")) return null;

    const [lhsRaw, rhsRaw] = rule.split("->");
    if (!lhsRaw || !rhsRaw) return null;

    const lhs = lhsRaw.split(",").map((s) => s.trim());
    const rhs = rhsRaw.split(",").map((s) => s.trim());

    if (lhs.length < 3 || rhs.length < 2) return null;

    const [state, input, stackTop] = lhs;
    const [nextState, pushStr] = rhs;

    return {
      state: state || "",
      input: input || "e",
      stackTop: stackTop || "e",
      nextState: nextState || "",
      pushStr: pushStr || "e",
      original: rule,
    };
  }

  function parseAllRules() {
    return dom.rules.value
      .split("\n")
      .map((line) => parseRuleLine(line.trim()))
      .filter(Boolean);
  }

  function resetView() {
    dom.dispState.innerText = "-";
    dom.dispInput.innerText = "-";
    dom.dispResult.innerText = "Waiting...";
    dom.dispResult.className = "neutral";
    dom.stackVisual.innerHTML = "";
    dom.traceLog.innerHTML = "";
  }

  function invalidateSimulation() {
    stopSimulationTimer();
    pda = null;
    history = [];
    if (network) {
      network.destroy();
      network = null;
    }
    nodes.clear();
    edges.clear();
    dom.graphContainer.innerHTML = "";
    dom.btnBack.disabled = true;
    resetView();
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const isLight =
        document.documentElement.getAttribute("data-theme") === "light";
      document.documentElement.setAttribute(
        "data-theme",
        isLight ? "dark" : "light",
      );
      if (themeIcon) {
        themeIcon.className = isLight ? "fas fa-sun" : "fas fa-moon";
      }
      if (themeText) {
        themeText.textContent = isLight ? "Light Mode" : "Dark Mode";
      }
    });
  }

  [dom.states, dom.start, dom.accept, dom.rules, dom.inputStr].forEach((el) => {
    el.addEventListener("input", invalidateSimulation);
  });

  document.querySelectorAll('input[name="stack-init"]').forEach((el) => {
    el.addEventListener("change", invalidateSimulation);
  });

  function initGraph() {
    const stateList = parseList(dom.states.value);
    const acceptList = parseList(dom.accept.value);
    const startState = dom.start.value.trim();
    const rules = parseAllRules();

    nodes.clear();
    edges.clear();

    stateList.forEach((s) => {
      nodes.add({
        id: s,
        label: s,
        shape: "circle",
        borderWidth: acceptList.includes(s) ? 4 : 1,
        color: {
          background: "#fff",
          border: s === startState ? "#c28e5c" : "#888",
        },
      });
    });

    const edgeMap = {};

    rules.forEach((rule) => {
      if (!rule.state || !rule.nextState) return;

      const edgeKey = `${rule.state}->${rule.nextState}`;
      const labelText = `${rule.input}, ${rule.stackTop} / ${rule.pushStr}`;

      if (edgeMap[edgeKey]) {
        edgeMap[edgeKey].label += `\n${labelText}`;
      } else {
        edgeMap[edgeKey] = {
          id: edgeKey,
          from: rule.state,
          to: rule.nextState,
          label: labelText,
          arrows: "to",
          font: { size: 11, align: "top", multi: "html" },
          color: { color: "#888" },
          smooth:
            rule.state === rule.nextState
              ? { type: "curvedCW", roundness: 0.5 }
              : false,
        };
      }
    });

    edges.add(Object.values(edgeMap));

    const options = {
      physics: { stabilization: true },
      edges: { smooth: true },
    };

    if (network) network.destroy();
    network = new vis.Network(dom.graphContainer, { nodes, edges }, options);
  }

  function buildSample1Rules(stackMode) {
    if (stackMode === "empty") {
      return [
        "q0, a, e -> q0, a",
        "q0, a, a -> q0, aa",
        "q0, b, a -> q1, e",
        "q1, b, a -> q1, e",
        "q1, e, e -> q2, e",
      ].join("\n");
    }

    return [
      "q0, a, Z -> q0, aZ",
      "q0, a, a -> q0, aa",
      "q0, b, a -> q1, e",
      "q1, b, a -> q1, e",
      "q1, e, Z -> q2, Z",
    ].join("\n");
  }

  function buildSample2Rules(stackMode) {
    if (stackMode === "empty") {
      return [
        "q0, a, e -> q0, e",
        "q0, b, e -> q1, e",
        "q1, b, e -> q1, e",
      ].join("\n");
    }

    return ["q0, a, Z -> q0, Z", "q0, b, Z -> q1, Z", "q1, b, Z -> q1, Z"].join(
      "\n",
    );
  }

  function initPDA() {
    stopSimulationTimer();

    const stackInit = getStackMode();
    const acceptStates = parseList(dom.accept.value);
    const rules = parseAllRules();
    const transitions = {};

    rules.forEach((rule) => {
      const key = `${rule.state}|${rule.input}|${rule.stackTop}`;
      transitions[key] = {
        nextState: rule.nextState,
        pushStr: rule.pushStr,
        original: rule.original,
      };
    });

    pda = {
      currentState: dom.start.value.trim(),
      acceptStates,
      transitions,
      inputRemaining: dom.inputStr.value.trim() || "e",
      stack: stackInit === "Z" ? ["Z"] : [],
      status: "Running",
      traceHtml: "",
      stackInit,
    };

    history = [];
    dom.btnBack.disabled = true;
    dom.traceLog.innerHTML = "";
    initGraph();
    updateUI();
    log("PDA Initialized.");
  }

  function checkAcceptance() {
    const inputDone = pda.inputRemaining === "e" || pda.inputRemaining === "";

    if (!inputDone) return;

    const canMove = Object.keys(pda.transitions).some((k) =>
      k.startsWith(`${pda.currentState}|e|`),
    );

    if (!canMove) {
      if (pda.stackInit === "empty") {
        pda.status = pda.stack.length === 0 ? "Accepted" : "Rejected";
      } else {
        pda.status = pda.acceptStates.includes(pda.currentState)
          ? "Accepted"
          : "Rejected";
      }
    }
  }

  function updateUI() {
    if (!pda) {
      resetView();
      return;
    }

    dom.dispState.innerText = pda.currentState || "-";
    dom.dispInput.innerText = pda.inputRemaining || "-";
    dom.dispResult.innerText = pda.status;
    dom.dispResult.className = pda.status.toLowerCase();

    nodes.update(
      nodes.get().map((n) => ({
        id: n.id,
        color: { background: n.id === pda.currentState ? "#e0aaff" : "#fff" },
      })),
    );

    dom.stackVisual.innerHTML = "";
    [...pda.stack].reverse().forEach((s) => {
      const el = document.createElement("div");
      el.className = "stack-item";
      el.innerText = s;
      dom.stackVisual.appendChild(el);
    });
  }

  function log(msg) {
    const li = document.createElement("li");
    li.innerText = msg;
    dom.traceLog.appendChild(li);
    dom.traceLog.scrollTop = dom.traceLog.scrollHeight;
  }

  function step() {
    if (!pda || pda.status !== "Running") return;

    pda.traceHtml = dom.traceLog.innerHTML;
    history.push(JSON.parse(JSON.stringify(pda)));
    dom.btnBack.disabled = false;

    const state = pda.currentState;
    const stackTop =
      pda.stack.length > 0 ? pda.stack[pda.stack.length - 1] : "e";
    const nextInput =
      pda.inputRemaining !== "e" && pda.inputRemaining.length > 0
        ? pda.inputRemaining[0]
        : "e";

    let ruleKey = `${state}|${nextInput}|${stackTop}`;
    let matchedInput = nextInput;

    if (!pda.transitions[ruleKey]) {
      ruleKey = `${state}|e|${stackTop}`;
      matchedInput = "e";
    }

    const rule = pda.transitions[ruleKey];

    if (rule) {
      pda.currentState = rule.nextState;

      if (matchedInput !== "e") {
        pda.inputRemaining = pda.inputRemaining.substring(1) || "e";
      }

      if (stackTop !== "e" && pda.stack.length > 0) {
        pda.stack.pop();
      }

      if (rule.pushStr !== "e") {
        for (let i = rule.pushStr.length - 1; i >= 0; i--) {
          pda.stack.push(rule.pushStr[i]);
        }
      }

      log(
        `δ(${state}, ${matchedInput}, ${stackTop}) → (${rule.nextState}, ${rule.pushStr})`,
      );
      checkAcceptance();
      updateUI();
    } else {
      pda.status = "Rejected";
      log(`No transition for [${state}, ${nextInput}, ${stackTop}]`);
      updateUI();
    }
  }

  function stepBack() {
    if (history.length === 0) return;

    pda = history.pop();
    if (history.length === 0) dom.btnBack.disabled = true;

    dom.traceLog.innerHTML = pda.traceHtml;
    log("Reverted to previous state.");
    updateUI();
  }

  dom.btnLoad1.addEventListener("click", () => {
    const stackMode = getStackMode();
    dom.states.value = "q0, q1, q2";
    dom.start.value = "q0";
    dom.accept.value = "q2";
    dom.rules.value = buildSample1Rules(stackMode);
    dom.inputStr.value = "aabb";
    initPDA();
  });

  dom.btnLoad2.addEventListener("click", () => {
    const stackMode = getStackMode();
    dom.states.value = "q0, q1";
    dom.start.value = "q0";
    dom.accept.value = "q1";
    dom.rules.value = buildSample2Rules(stackMode);
    dom.inputStr.value = "aaabb";
    initPDA();
  });

  dom.btnStep.addEventListener("click", () => {
    stopSimulationTimer();
    if (!pda) initPDA();
    step();
  });

  dom.btnBack.addEventListener("click", () => {
    stopSimulationTimer();
    stepBack();
  });

  dom.btnSimulate.addEventListener("click", () => {
    initPDA();
    simTimer = setInterval(() => {
      if (!pda || pda.status !== "Running") {
        stopSimulationTimer();
      } else {
        step();
      }
    }, 600);
  });

  // Navbar active section handling
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".section");

  function updateActiveNav() {
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= sectionTop - sectionHeight / 3) {
        current = section.getAttribute("id");
      }
    });
    navItems.forEach((item) => {
      item.classList.remove("active");
      if (item.getAttribute("href") === "#" + current) {
        item.classList.add("active");
      }
    });
  }

  window.addEventListener("scroll", updateActiveNav);
  updateActiveNav(); // Initial call

  dom.btnReset.addEventListener("click", () => {
    dom.states.value = "";
    dom.start.value = "";
    dom.accept.value = "";
    dom.rules.value = "";
    dom.inputStr.value = "";
    setStackMode("Z");
    invalidateSimulation();
  });
});
