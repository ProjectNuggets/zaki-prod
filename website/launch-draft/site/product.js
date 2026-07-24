(function () {
  "use strict";

  var product = document.body.dataset.product;
  var products = {
    agent: {
      name: "Agent",
      status: "Available now",
      statusClass: "",
      kicker: "ZAKI / Agent",
      title: "Give it a goal. See the work move.",
      summary: "ZAKI Agent plans the work, uses the tools and context you allow, and keeps the run visible from first step to approval, artifact, and trace.",
      cta: "Open ZAKI Agent",
      evidenceLabel: "Live execution",
      evidenceChip: "In progress",
      mode: "agent",
      proofTitle: "Agency you can inspect.",
      proofCopy: "The point is not another answer. It is a visible run: a plan, the context behind it, work in progress, an approval boundary, and outputs you can inspect.",
      proofs: [
        ["01", "Builds a plan you can inspect", "The objective, work units, blockers, and next step stay visible instead of disappearing into one long response."],
        ["02", "Works with connected context", "Brain can bring relevant notes, decisions, relationships, and prior work into the run with source visibility."],
        ["03", "Uses focused work units", "Larger goals can be divided into smaller units while the parent run keeps their state and outputs together."],
        ["04", "Makes the boundary explicit", "You choose the approval posture. When a run requires your judgment, Agent surfaces the proposed action and waits." ]
      ],
      brain: true
    },
    spaces: {
      name: "Spaces",
      status: "Available now",
      statusClass: "",
      kicker: "ZAKI / Spaces",
      title: "One project. Every thread in context.",
      summary: "ZAKI Spaces keeps project sources, conversation, and decisions in one scoped place, so the next answer starts from the work that shaped it.",
      cta: "Open ZAKI Spaces",
      evidenceLabel: "Launch space",
      evidenceChip: "3 sources",
      mode: "spaces",
      proofTitle: "Shared context you can inspect.",
      proofCopy: "A Space gives the work a defined boundary. The source set, active threads, and decisions stay visible instead of becoming invisible context behind an answer.",
      proofs: [
        ["01", "Defines the project boundary", "Keep the brief, files, participants, and active questions scoped to the work instead of mixing every context together."],
        ["02", "Keeps sources in view", "The source set stays beside the conversation, giving the team a clear way to inspect what informed the response."],
        ["03", "Connects related threads", "New questions can begin from the material and discussion already collected in the Space."],
        ["04", "Makes the decision visible", "Record the current direction and next action where the team can find them before the next conversation begins." ]
      ],
      brain: true
    },
    minutes: {
      name: "Minutes",
      status: "Staged access",
      statusClass: "z-status--staged",
      kicker: "ZAKI / Minutes",
      title: "Turn a meeting into its next moves.",
      summary: "ZAKI Minutes is rolling out in staged access for meeting capture, reviewable next moves, and visible meeting-state controls.",
      cta: "Explore staged access",
      evidenceLabel: "Meeting workflow",
      evidenceChip: "Staged rollout",
      mode: "minutes",
      proofTitle: "Capture less. Carry more forward.",
      proofCopy: "The staged Minutes workflow is focused on the handoff after a conversation: what changed, who owns the next move, and what a user can review before it moves forward.",
      proofs: [
        ["01", "Make the capture visible", "ZAKI joins as an identified meeting participant. Recording and processing state should never be ambiguous to the user."],
        ["02", "Extract what changed", "Minutes separates decisions, actions, owners, and open questions from the full speaker-aware transcript."],
        ["03", "Keep follow-up reviewable", "The first release prepares a ready-to-send draft. The user reviews it and chooses when and where to send it."],
        ["04", "Keep retention reviewable", "The rollout keeps meeting state and follow-up review visible; account-level retention and deletion controls remain the source of truth." ]
      ],
      brain: false
    },
    design: {
      name: "Design",
      status: "Staged access",
      statusClass: "z-status--staged",
      kicker: "ZAKI / Design",
      title: "Turn a brief into something you can use.",
      summary: "ZAKI Design is rolling out in staged access for creative direction, feedback, iterations, and usable project artifacts.",
      cta: "Explore staged access",
      evidenceLabel: "Creative direction",
      evidenceChip: "Staged rollout",
      mode: "design",
      proofTitle: "Direction before decoration.",
      proofCopy: "The staged Design workflow is built around the decisions that make creative work coherent: the brief, direction, feedback, and artifact stay connected as the work moves forward.",
      proofs: [
        ["01", "Start from the purpose", "Ground the work in its audience, objective, message, references, and constraints before choosing a visual answer."],
        ["02", "Choose a direction", "Make typography, color, hierarchy, and rhythm explicit enough that the team can react to one coherent system."],
        ["03", "Keep the iteration legible", "Each revision stays connected to the feedback and decision that changed it instead of becoming an unexplained replacement."],
        ["04", "Leave with a usable artifact", "The result belongs to a project with real files and a visible run state, ready for the next edit, export, or implementation step." ]
      ],
      brain: false
    }
  };

  var data = products[product];
  if (!data) return;

  document.querySelectorAll("[data-product-name]").forEach(function (node) { node.textContent = data.name; });
  document.querySelectorAll("[data-status]").forEach(function (node) {
    var indicator = node.querySelector("i") || document.createElement("i");
    indicator.setAttribute("aria-hidden", "true");
    node.replaceChildren(indicator, document.createTextNode(data.status));
    if (data.statusClass) node.classList.add(data.statusClass);
  });
  document.querySelector("[data-kicker]").textContent = data.kicker;
  document.querySelector("[data-title]").textContent = data.title;
  document.querySelector("[data-summary]").textContent = data.summary;
  document.querySelector("[data-cta]").textContent = data.cta;
  document.querySelector("[data-evidence-label]").textContent = data.evidenceLabel;
  document.querySelector("[data-evidence-chip]").textContent = data.evidenceChip;
  document.querySelector("[data-proof-title]").textContent = data.proofTitle;
  document.querySelector("[data-proof-copy]").textContent = data.proofCopy;

  var evidence = document.querySelector("[data-evidence]");
  evidence.classList.toggle("z-evidence--paper", data.mode === "spaces" || data.mode === "design");
  evidence.dataset.mode = data.mode;

  var visual = document.querySelector("[data-visual]");
  var proofs = document.querySelector("[data-proofs]");
  proofs.innerHTML = data.proofs.map(function (proof) {
    return '<article class="z-proof"><span class="z-proof__index">' + proof[0] + '</span><h3>' + proof[1] + '</h3><p>' + proof[2] + '</p></article>';
  }).join("");

  if (data.mode === "agent") {
    visual.innerHTML = '<div class="z-evidence__goal"><span>Goal</span><strong>Choose the right launch partner</strong></div><div class="z-evidence__rows"><div class="z-evidence__row"><b>01</b><div><span>Plan</span><strong>Decision criteria defined</strong></div><i></i></div><div class="z-evidence__row"><b>02</b><div><span>Sources</span><strong>Comparing qualified options</strong></div><i></i></div><div class="z-evidence__row"><b>03</b><div><span>Artifact</span><strong>Recommendation queued</strong></div><i></i></div></div><div class="z-evidence__decision"><span>Approval boundary</span><strong>Share the final shortlist</strong></div>';
  } else if (data.mode === "spaces") {
    visual.innerHTML = '<div class="z-source-layout"><div class="z-thread"><div class="z-message"><b>Maya</b>Which part is ready to ship?</div><div class="z-message z-message--zaki"><b>ZAKI</b>The launch brief and decision log support onboarding first.</div></div><div class="z-sources"><span class="z-evidence__label">In context</span><div class="z-source">brief.md <i></i></div><div class="z-source">research-01 <i></i></div><div class="z-source">decision-log <i></i></div></div></div><div class="z-evidence__decision"><span>Current decision</span><strong>Ship onboarding first</strong></div>';
  } else if (data.mode === "minutes") {
    visual.innerHTML = '<div class="z-evidence__goal"><span>Meeting</span><strong>Weekly product sync</strong></div><div class="z-evidence__rows"><div class="z-evidence__row"><b>09:04</b><div><span>Decision</span><strong>Launch timing settled</strong></div><i></i></div><div class="z-evidence__row"><b>09:12</b><div><span>Action</span><strong>Pilot with two teams</strong></div><i></i></div><div class="z-evidence__row"><b>09:18</b><div><span>Owner</span><strong>Ayesha, Friday</strong></div><i></i></div></div><div class="z-evidence__decision"><span>Recap</span><strong>3 owners, 2 decisions</strong></div>';
  } else {
    visual.innerHTML = '<div class="z-design-evidence"><div class="z-design-evidence__brief"><span>Brief</span><strong>Make the launch feel focused, useful, and unmistakably ours.</strong></div><div class="z-design-evidence__direction"><div><span>Direction</span><strong>Editorial utility</strong></div><div class="z-design-evidence__swatches" aria-label="Direction colors"><i></i><i></i><i></i></div></div><div class="z-design-evidence__preview"><small>YOUR NEXT<br>CHAPTER<br>NEEDS A<br>DIRECTION.</small><span></span></div></div><div class="z-evidence__decision"><span>Active artifact</span><strong>Launch page · V03</strong></div>';
  }

  var brain = document.querySelector("[data-brain]");
  if (!data.brain && brain) brain.remove();

  document.querySelectorAll("[data-mail-subject]").forEach(function (link) {
    link.href = "mailto:support@chatzaki.com?subject=" + encodeURIComponent("ZAKI " + data.name + " access");
  });
  if (data.mode === "agent") {
    document.querySelectorAll("[data-agent-handoff]").forEach(function (link) {
      link.href = "https://app.chatzaki.com/agent?source=website_product_agent&intent=agent";
    });
  }
  if (data.mode === "spaces") {
    document.querySelectorAll("[data-space-handoff]").forEach(function (link) {
      link.href = "https://app.chatzaki.com/spaces?source=website_product_spaces&intent=chat";
    });
  }
  if (data.mode === "minutes") {
    document.querySelectorAll("[data-minutes-handoff]").forEach(function (link) {
      link.href = "https://app.chatzaki.com/minutes?source=website_product_minutes&intent=minutes";
    });
  }
  if (data.mode === "design") {
    document.querySelectorAll("[data-design-handoff]").forEach(function (link) {
      link.href = "https://app.chatzaki.com/design?source=website_product_design&intent=design";
    });
  }
  document.querySelector("[data-year]").textContent = new Date().getFullYear();
}());
