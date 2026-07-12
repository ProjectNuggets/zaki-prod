import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = new URL("../../outputs/novaorbit-assets/", import.meta.url);
const publicDir = new URL("../../public/assets/downloads/", import.meta.url);
const workbookPath = new URL("novaorbit-scoring-workbook.xlsx", outputDir);
const publicWorkbookPath = new URL("novaorbit-scoring-workbook.xlsx", publicDir);
const previewDir = new URL("previews/", outputDir);

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(publicDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const workbook = Workbook.create();

const colors = {
  ink: "#17120E",
  deep: "#0F0C09",
  paper: "#FFFAF1",
  sand: "#EFE4D2",
  ember: "#C9582C",
  terra: "#A65B36",
  sage: "#6EA888",
  line: "#D8CDBB",
  muted: "#776D60",
  warn: "#F4C27A",
};

const stageLabels = [
  "Stage 1: Ad Hoc AI",
  "Stage 2: Connected AI",
  "Stage 3: Operational AI",
  "Stage 4: Owned AI Workforce",
];

const gates = [
  ["Where", "W1", "Deployment Boundary", 2, "Medium", "Cloud preference known; boundary workshop needed", "Data residency and support model not finalized", "CTO / IT", "Confirm deployment boundary and support model"],
  ["Where", "W2", "Inference Readiness", 2, "Medium", "Expected volume and latency known", "Cost envelope not validated under load", "CTO / IT", "Estimate inference cost, latency, fallback, and monitoring"],
  ["Where", "W3", "Access Readiness", 1, "Low", "Source systems named", "API/MCP/export path not validated", "IT / system owner", "Validate least-privilege API, export, database, or upload path"],
  ["Where", "W4", "Control Plane", 2, "Medium", "Identity and logging tools exist", "AI run ledger not designed", "Security / IT", "Define identity, logging, audit, and retention controls"],
  ["What", "A1", "Workflow Fit", 3, "High", "RFQ process is repeated and painful", "None for v1", "Department owner", "Create v1 workflow map and acceptance criteria"],
  ["What", "A2", "Agent Role", 2, "Medium", "Quote analyst role is clear", "Evaluation examples missing", "Workflow owner", "Define outputs, forbidden actions, fallback, and quality checks"],
  ["What", "A3", "App Surface", 2, "Medium", "Inbox plus approval dashboard selected", "Screen states not finalized", "Product / ops", "Define user surface, states, actions, and approvals"],
  ["What", "A4", "Integration Depth", 1, "Low", "Read-only first step preferred", "Writeback path not approved", "IT / security", "Start read-only; defer writeback until controls pass"],
  ["How", "H1", "Ownership", 2, "Medium", "Sponsor and department owner named", "Approval owner needs confirmation", "Client sponsor", "Confirm executive, workflow, IT, finance, and approval owners"],
  ["How", "H2", "Business Case", 1, "Low", "Proxy value exists", "Finance baseline not validated", "CFO / finance", "Validate volume, hourly cost proxy, quality and speed assumptions"],
  ["How", "H3", "Governance", 2, "Medium", "Escalation appetite understood", "Policy details still open", "Security / compliance", "Define oversight, escalation, and risk posture"],
  ["How", "H4", "Run Model", 1, "Low", "Pilot support expectation exists", "Monitoring and adoption owner not finalized", "Operations", "Define adoption, support, monitoring, and continuous improvement rhythm"],
];

const redGates = [
  ["No access, no AI", "Conditional", 2, "Source systems, permissions, APIs, MCPs, approved exports, or controlled uploads are not clear enough.", "CTO / IT", "Validate access path before build or exclude blocked retrieval from v1."],
  ["No workflow, no agent", "Closed", 2, "The work is not repeatable, owned, measurable, or tied to business value.", "Department owner", "RFQ workflow is clear enough for v1; keep exception list current."],
  ["No owner, no impact", "Closed", 2, "Executive sponsor, workflow owner, IT owner, finance owner, or approval owner is missing.", "Client sponsor", "Confirm approval owner in kickoff."],
  ["No evidence, no scale", "Conditional", 3, "Value, quality, risk, cost, cycle time, or revenue cannot be measured after launch.", "CFO / owner", "Baseline before pilot and review evidence before scale."],
  ["No reliability, no autonomy", "Conditional", 3, "Outputs cannot be tested, monitored, reviewed, or safely constrained for the proposed autonomy level.", "Workflow owner / security", "Create evaluation set, approval rules, fallback, and monitoring before autonomy."],
];

const actionRows = [
  ["W1", "Confirm deployment boundary", "CTO / IT", "Week 1", "Architecture note and decision owner", "Open"],
  ["W3", "Validate SAP/API/export/manual upload path", "IT / system owner", "Week 1", "Least-privilege access decision", "Open"],
  ["A2", "Create quote output evaluation set", "Workflow owner", "Week 1-2", "Gold-standard RFQs and accepted quote criteria", "Open"],
  ["H2", "Finance-validate baseline and proxy value", "CFO / finance", "Week 2", "Reviewed volume, cost, quality, and speed assumptions", "Open"],
  ["RG5", "Define reliability and autonomy cap", "Security / workflow owner", "Week 2", "Test, monitoring, fallback, and approval rules", "Open"],
  ["Next", "Decide implementation path", "Client sponsor", "Readout", "Standard output or In-Depth SOW decision", "Open"],
];

const scoreToStageFormula = (cell) => `=IF(${cell}<=3,1,IF(${cell}<=6,2,IF(${cell}<=9,3,4)))`;
const stageLabelFormula = (stageCell) => `=CHOOSE(${stageCell},"${stageLabels.join('","')}")`;

function styleSheet(sheet, widthMap = []) {
  sheet.showGridLines = false;
  widthMap.forEach(([range, widthPx]) => {
    sheet.getRange(range).format.columnWidthPx = widthPx;
  });
}

function title(sheet, titleText, subtitleText, lastCol = "H") {
  sheet.getRange(`A1:${lastCol}1`).merge();
  sheet.getRange("A1").values = [[titleText]];
  sheet.getRange("A1").format = {
    fill: colors.deep,
    font: { bold: true, color: colors.paper, size: 20 },
  };
  sheet.getRange("A1").format.rowHeightPx = 44;
  sheet.getRange(`A2:${lastCol}2`).merge();
  sheet.getRange("A2").values = [[subtitleText]];
  sheet.getRange("A2").format = {
    fill: colors.ink,
    font: { color: "#D8CDBB", size: 10 },
  };
  sheet.getRange("A2").format.rowHeightPx = 30;
}

function header(range) {
  range.format = {
    fill: colors.ink,
    font: { bold: true, color: colors.paper, size: 10 },
    wrapText: true,
  };
}

function sectionHeader(range) {
  range.format = {
    fill: colors.sand,
    font: { bold: true, color: colors.ink, size: 11 },
  };
}

function body(range) {
  range.format = {
    fill: colors.paper,
    font: { color: colors.ink, size: 10 },
    wrapText: true,
    borders: { preset: "all", style: "thin", color: colors.line },
  };
}

function muted(range) {
  range.format = {
    fill: "#F6EFE3",
    font: { color: colors.muted, size: 9 },
    wrapText: true,
  };
}

const dashboard = workbook.worksheets.add("Dashboard");
styleSheet(dashboard, [
  ["A:A", 170],
  ["B:B", 150],
  ["C:C", 190],
  ["D:D", 190],
  ["E:E", 210],
  ["F:F", 210],
]);
title(
  dashboard,
  "NovaOrbit Scoring Workbook",
  "Where AI can work, what it should do, and how the business captures impact.",
  "F",
);

dashboard.getRange("A4:F4").values = [["Executive output", "", "", "", "", ""]];
dashboard.getRange("A4:F4").merge(true);
sectionHeader(dashboard.getRange("A4:F4"));
dashboard.getRange("A5:F11").values = [
  ["Client", "Atlas Components GmbH", "Prepared by", "Nova Nuggets", "Assessment type", "Standard / In-Depth"],
  ["Overall raw stage", null, "Red-gate cap", null, "Final stage", null],
  ["Overall raw label", null, "Cap label", null, "Final label", null],
  ["Recommended first workflow", "RFQ response and quotation preparation", "Deployment direction", "Customer cloud first; NooX if required", "Commercial next step", null],
  ["Primary blocker", null, "Evidence confidence", null, "Decision", null],
  ["Conservative annual value", null, "Expected annual value", null, "Upside annual value", null],
  ["One-line readout", null, "", "", "", ""],
];
body(dashboard.getRange("A5:F11"));
dashboard.getRange("B6").formulas = [["=MEDIAN(C15:C17)"]];
dashboard.getRange("D6").formulas = [["=MIN('Red Gates'!G6:G10)"]];
dashboard.getRange("F6").formulas = [["=MIN(B6,D6)"]];
dashboard.getRange("B7").formulas = [[stageLabelFormula("B6")]];
dashboard.getRange("D7").formulas = [[stageLabelFormula("D6")]];
dashboard.getRange("F7").formulas = [[stageLabelFormula("F6")]];
dashboard.getRange("F8").formulas = [["=IF(F6<=2,\"Resolve red gates before implementation\",IF(F6=3,\"Scope first workflow build\",\"Scale managed AI workforce\"))"]];
dashboard.getRange("B9").formulas = [["='Red Gates'!A6"]];
dashboard.getRange("D9").formulas = [["=IF(AVERAGE(B15:B17)>=3,\"Medium-high\",IF(AVERAGE(B15:B17)>=2,\"Medium\",\"Low\"))"]];
dashboard.getRange("F9").formulas = [["=IF(F6<3,\"Do not scale yet\",IF(F6=3,\"Build controlled v1\",\"Scale with run model\"))"]];
dashboard.getRange("B10").formulas = [["='Workflow ROI'!B27"]];
dashboard.getRange("D10").formulas = [["='Workflow ROI'!B28"]];
dashboard.getRange("F10").formulas = [["='Workflow ROI'!B29"]];
dashboard.getRange("B11:F11").merge();
dashboard.getRange("B11").formulas = [["=\"Current read: \"&F7&\". First workflow: \"&B8&\". Next decision: \"&F8&\".\""]];
dashboard.getRange("B10:F10").format.numberFormat = "€#,##0";

dashboard.getRange("A14:F14").values = [["Dimension", "Score", "Stage", "Stage Label", "Key blocker", "Default action"]];
header(dashboard.getRange("A14:F14"));
dashboard.getRange("A15:F17").values = [
  ["Where: Infrastructure & Access", null, null, null, "Access path not validated", "Confirm deployment and access route"],
  ["What: Applications & Agents", null, null, null, "Evaluation set missing", "Define agent/app role and approval workflow"],
  ["How: Operations & Impact", null, null, null, "Finance baseline not validated", "Validate ROI assumptions and ownership"],
];
body(dashboard.getRange("A15:F17"));
dashboard.getRange("B15").formulas = [["=SUMIF('Scorecard'!A7:A18,\"Where\",'Scorecard'!D7:D18)"]];
dashboard.getRange("B16").formulas = [["=SUMIF('Scorecard'!A7:A18,\"What\",'Scorecard'!D7:D18)"]];
dashboard.getRange("B17").formulas = [["=SUMIF('Scorecard'!A7:A18,\"How\",'Scorecard'!D7:D18)"]];
dashboard.getRange("C15").formulas = [[scoreToStageFormula("B15")]];
dashboard.getRange("C15:C17").fillDown();
dashboard.getRange("D15").formulas = [[stageLabelFormula("C15")]];
dashboard.getRange("D15:D17").fillDown();
dashboard.getRange("B15:C17").format.numberFormat = "0";

dashboard.getRange("A20:F20").values = [["How to use", "", "", "", "", ""]];
dashboard.getRange("A20:F20").merge(true);
sectionHeader(dashboard.getRange("A20:F20"));
dashboard.getRange("A21:F24").values = [
  ["1", "Score each gate from 0 to 3 in Scorecard.", "0 = missing; 3 = operational.", "", "", ""],
  ["2", "Set red-gate status in Red Gates.", "Open or Conditional caps maturity.", "", "", ""],
  ["3", "Edit Workflow ROI inputs.", "The value model separates capacity, quality, speed, revenue, and risk.", "", "", ""],
  ["4", "Use Action Plan for client next steps.", "Treat missing evidence as an action, not as optimism.", "", "", ""],
];
body(dashboard.getRange("A21:F24"));
dashboard.getRange("B21:F24").merge(true);
dashboard.freezePanes.freezeRows(4);

const scorecard = workbook.worksheets.add("Scorecard");
styleSheet(scorecard, [
  ["A:A", 110],
  ["B:B", 90],
  ["C:C", 190],
  ["D:D", 90],
  ["E:E", 130],
  ["F:F", 230],
  ["G:G", 230],
  ["H:H", 130],
  ["I:I", 230],
]);
title(scorecard, "NovaOrbit 12-Benchmark Scorecard", "Edit scores, confidence, owners, evidence, blockers, and next actions.", "I");
scorecard.getRange("A5:I5").values = [["Dimension", "Gate Code", "Gate", "Score 0-3", "Evidence Confidence", "Key Evidence", "Blocker", "Owner", "Next Action"]];
header(scorecard.getRange("A5:I5"));
scorecard.getRange("A6:I6").values = [["Use 0 = Missing, 1 = Informal, 2 = Defined, 3 = Operational. Score conservatively when evidence is weak.", "", "", "", "", "", "", "", ""]];
scorecard.getRange("A6:I6").merge(true);
muted(scorecard.getRange("A6:I6"));
scorecard.getRange("A7:I18").values = gates;
body(scorecard.getRange("A7:I18"));
scorecard.getRange("D7:D18").dataValidation = { rule: { type: "whole", operator: "between", formula1: 0, formula2: 3 } };
scorecard.getRange("E7:E18").dataValidation = { rule: { type: "list", values: ["Low", "Medium", "High"] } };
scorecard.getRange("D7:D18").conditionalFormats.add("colorScale", {
  thresholds: ["min", "50%", "max"],
  colors: ["#F4C27A", "#EFE4D2", "#6EA888"],
});
scorecard.getRange("A20:I20").values = [["Score", "Label", "Meaning", "", "Evidence standard", "", "", "Default posture", ""]];
scorecard.getRange("C20:D20").merge(true);
scorecard.getRange("E20:G20").merge(true);
scorecard.getRange("H20:I20").merge(true);
header(scorecard.getRange("A20:I20"));
scorecard.getRange("A21:I24").values = [
  [0, "Missing", "No reliable evidence exists.", "", "Stakeholders cannot describe it or answer depends on assumptions.", "", "", "Do not build yet.", ""],
  [1, "Informal", "Capability exists in pockets.", "", "Interview evidence exists; artifacts, owners, or controls are weak.", "", "", "Discover and validate.", ""],
  [2, "Defined", "Capability is documented, owned, and usable.", "", "Artifacts exist, owners are named, and constraints are clear enough.", "", "", "Prepare implementation.", ""],
  [3, "Operational", "Capability is active or ready for production controls.", "", "Operating records, controls, runbooks, metrics, or systems prove it.", "", "", "Build or scale.", ""],
];
for (const row of [21, 22, 23, 24]) {
  scorecard.getRange(`C${row}:D${row}`).merge(true);
  scorecard.getRange(`E${row}:G${row}`).merge(true);
  scorecard.getRange(`H${row}:I${row}`).merge(true);
}
body(scorecard.getRange("A21:I24"));
scorecard.freezePanes.freezeRows(6);

const redGateSheet = workbook.worksheets.add("Red Gates");
styleSheet(redGateSheet, [
  ["A:A", 190],
  ["B:B", 130],
  ["C:C", 95],
  ["D:D", 290],
  ["E:E", 140],
  ["F:F", 270],
  ["G:G", 95],
]);
title(redGateSheet, "NovaOrbit Red-Gate Caps", "Open or conditional red gates cap maturity and prevent false readiness claims.", "G");
redGateSheet.getRange("A5:G5").values = [["Red Gate", "Status", "Cap Stage", "Trigger", "Owner", "Required Action", "Effective Cap"]];
header(redGateSheet.getRange("A5:G5"));
redGateSheet.getRange("A6:F10").values = redGates;
body(redGateSheet.getRange("A6:G10"));
redGateSheet.getRange("G6").formulas = [["=IF(B6=\"Closed\",4,C6)"]];
redGateSheet.getRange("G6:G10").fillDown();
redGateSheet.getRange("B6:B10").dataValidation = { rule: { type: "list", values: ["Open", "Conditional", "Closed"] } };
redGateSheet.getRange("B6:B10").conditionalFormats.add("containsText", { text: "Open", format: { fill: "#F4C27A", font: { bold: true, color: colors.ink } } });
redGateSheet.getRange("B6:B10").conditionalFormats.add("containsText", { text: "Conditional", format: { fill: "#EFE4D2", font: { bold: true, color: colors.ink } } });
redGateSheet.getRange("B6:B10").conditionalFormats.add("containsText", { text: "Closed", format: { fill: "#DDEBDD", font: { bold: true, color: colors.ink } } });
redGateSheet.freezePanes.freezeRows(5);

const roi = workbook.worksheets.add("Workflow ROI");
styleSheet(roi, [
  ["A:A", 240],
  ["B:B", 150],
  ["C:C", 340],
  ["D:D", 180],
  ["E:E", 90],
  ["F:F", 280],
]);
title(roi, "NovaOrbit Workflow ROI Model", "Conservative model: separate capacity, quality, speed, revenue, and risk. Finance validation required.", "F");
roi.getRange("A5:C5").values = [["Input", "Value", "Notes"]];
header(roi.getRange("A5:C5"));
roi.getRange("A6:C21").values = [
  ["Workflow", "RFQ response and quotation preparation", "Name the workflow, not a generic AI use case."],
  ["Workflow volume per week", 120, "Cases, tickets, requests, RFQs, or tasks."],
  ["Active labor minutes per case", 35, "Human time, excluding waiting."],
  ["Fully loaded hourly cost proxy", 68, "Finance-reviewed where possible."],
  ["Working weeks per year", 46, "Conservative standard assumption."],
  ["Current cycle time days", 2.5, "Start to usable output."],
  ["Target cycle time days", 1.25, "Expected after controlled v1."],
  ["Expected assist rate", 0.28, "Share of active labor supported by AI."],
  ["Adoption rate", 0.65, "Share of workflow actually using the capability."],
  ["Rework/error rate", 0.11, "Share needing correction, escalation, or redo."],
  ["Rework minutes per case", 18, "Human correction time per rework case."],
  ["Quality improvement rate", 0.08, "Expected reduction in rework."],
  ["Value per faster case", 0, "Use only if finance accepts speed value."],
  ["Annual revenue value", 0, "Use only when accepted by revenue owner."],
  ["Annual risk/control value", 0, "Use only when accepted by compliance/finance."],
  ["Finance validation", "Proxy only", "Use Finance-reviewed only after CFO/finance signoff."],
];
body(roi.getRange("A6:C21"));
roi.getRange("B9:B9").format.numberFormat = "€#,##0";
roi.getRange("B13:B15").format.numberFormat = "0%";
roi.getRange("B16").format.numberFormat = "#,##0";
roi.getRange("B17").format.numberFormat = "0%";
roi.getRange("B18:B20").format.numberFormat = "€#,##0";
roi.getRange("B21").dataValidation = { rule: { type: "list", values: ["Proxy only", "Finance-reviewed"] } };
roi.getRange("D5:F5").values = [["Model Assumption", "Value", "Notes"]];
header(roi.getRange("D5:F5"));
roi.getRange("D6:F8").values = [
  ["Conservative capacity factor", 0.7, "Applied to capacity value in the conservative case."],
  ["Conservative rework factor", 0.5, "Applied to rework value in the conservative case."],
  ["Upside factor", 1.25, "Applied to expected value for upside case."],
];
body(roi.getRange("D6:F8"));
roi.getRange("E6:E8").format.numberFormat = "0%";
roi.getRange("A24:C24").values = [["Output", "Value", "Formula note"]];
header(roi.getRange("A24:C24"));
roi.getRange("A25:C32").values = [
  ["Weekly active hours", null, "Volume per week * active labor minutes / 60."],
  ["Weekly capacity released hours", null, "Weekly active hours * expected assist rate * adoption rate."],
  ["Conservative annual value", null, "Capacity and rework value multiplied by visible conservative factors, plus accepted direct values."],
  ["Expected annual value", null, "Capacity, rework, speed, revenue, and risk/control value."],
  ["Upside annual value", null, "Expected value multiplied by visible upside factor."],
  ["Cycle-time reduction", null, "Current cycle time minus target cycle time."],
  ["Finance status", null, "Proxy remains proxy until finance validates assumptions."],
  ["Recommended value language", null, "CFO-safe wording for readout."],
];
body(roi.getRange("A25:C32"));
roi.getRange("B25").formulas = [["=B7*B8/60"]];
roi.getRange("B26").formulas = [["=B25*B13*B14"]];
roi.getRange("B27").formulas = [["=(B26*B9*B10*$E$6)+((B7*B10)*B15*(B16/60)*B9*B17*$E$7)+(B7*B10*B18)+B19+B20"]];
roi.getRange("B28").formulas = [["=(B26*B9*B10)+((B7*B10)*B15*(B16/60)*B9*B17)+(B7*B10*B18)+B19+B20"]];
roi.getRange("B29").formulas = [["=B28*$E$8"]];
roi.getRange("B30").formulas = [["=B11-B12"]];
roi.getRange("B31").formulas = [["=B21"]];
roi.getRange("B32").formulas = [["=\"Conservative: \"&TEXT(B27,\"€#,##0\")&\"; Expected: \"&TEXT(B28,\"€#,##0\")&\"; Status: \"&B21&\".\""]];
roi.getRange("C32").values = [[""]];
roi.getRange("B32:C32").merge(true);
roi.getRange("B27:B29").format.numberFormat = "€#,##0";
roi.getRange("B25:B26").format.numberFormat = "#,##0.0";
roi.getRange("B30").format.numberFormat = "0.0";
roi.getRange("A35:F35").values = [["Scenario", "Assist rate", "Quality improvement", "Adoption", "Confidence", "Use in readout"]];
header(roi.getRange("A35:F35"));
roi.getRange("A36:F38").values = [
  ["Conservative", "10-15%", "0-5%", "50-60%", "High", "Lead with this unless finance approves stronger assumptions."],
  ["Expected", "20-35%", "5-15%", "60-80%", "Medium", "Use as operating case with dependencies named."],
  ["Upside", "35-50%", "15-25%", "80%+", "Low until proven", "Appendix only unless evidence is strong."],
];
body(roi.getRange("A36:F38"));
roi.freezePanes.freezeRows(5);

const actionPlan = workbook.worksheets.add("Action Plan");
styleSheet(actionPlan, [
  ["A:A", 90],
  ["B:B", 250],
  ["C:C", 150],
  ["D:D", 100],
  ["E:E", 260],
  ["F:F", 115],
]);
title(actionPlan, "NovaOrbit Action Plan", "Convert missing evidence into definitive next actions for the client and Nova Nuggets.", "F");
actionPlan.getRange("A5:F5").values = [["Gate", "Action", "Owner", "Timing", "Evidence Produced", "Status"]];
header(actionPlan.getRange("A5:F5"));
actionPlan.getRange("A6:F11").values = actionRows;
body(actionPlan.getRange("A6:F11"));
actionPlan.getRange("F6:F11").dataValidation = { rule: { type: "list", values: ["Open", "In progress", "Done", "Blocked"] } };
actionPlan.getRange("F6:F11").conditionalFormats.add("containsText", { text: "Done", format: { fill: "#DDEBDD", font: { bold: true, color: colors.ink } } });
actionPlan.getRange("F6:F11").conditionalFormats.add("containsText", { text: "Blocked", format: { fill: "#F4C27A", font: { bold: true, color: colors.ink } } });
actionPlan.getRange("A14:F14").values = [["Readout acceptance criteria", "", "", "", "", ""]];
actionPlan.getRange("A14:F14").merge(true);
sectionHeader(actionPlan.getRange("A14:F14"));
actionPlan.getRange("A15:F23").values = [
  ["1", "What stage are we in?", "Dashboard final stage", "", "", ""],
  ["2", "What caps maturity?", "Red Gates effective cap", "", "", ""],
  ["3", "Which workflow should go first?", "Dashboard first workflow", "", "", ""],
  ["4", "Where will it run?", "Deployment direction", "", "", ""],
  ["5", "What AI app or agent should be built?", "Scorecard A2/A3/A4", "", "", ""],
  ["6", "Who owns the outcome?", "Scorecard H1 and Action Plan", "", "", ""],
  ["7", "What metric proves value?", "Workflow ROI and evidence plan", "", "", ""],
  ["8", "What are the first 30/60/90-day actions?", "Action Plan and report template", "", "", ""],
  ["9", "What is the commercial next step?", "Dashboard decision", "", "", ""],
];
body(actionPlan.getRange("A15:F23"));
actionPlan.freezePanes.freezeRows(5);

for (const sheet of [dashboard, scorecard, redGateSheet, roi, actionPlan]) {
  const used = sheet.getUsedRange();
  used.format.autofitRows();
}

const inspection = await workbook.inspect({
  kind: "sheet,formula,match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  maxChars: 5000,
});
console.log(inspection.ndjson);

for (const sheetName of ["Dashboard", "Scorecard", "Red Gates", "Workflow ROI", "Action Plan"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(
    new URL(`${sheetName.toLowerCase().replaceAll(" ", "-")}.png`, previewDir),
    new Uint8Array(await preview.arrayBuffer()),
  );
}

const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(workbookPath.pathname);
await fs.copyFile(workbookPath, publicWorkbookPath);

console.log(JSON.stringify({
  workbook: workbookPath.pathname,
  publicWorkbook: publicWorkbookPath.pathname,
  previews: previewDir.pathname,
}));
