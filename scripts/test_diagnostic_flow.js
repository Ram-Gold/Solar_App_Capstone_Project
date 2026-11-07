// scripts/test_diagnostic_flow.js
// Automated verification test for the Rule-Based Troubleshooting Diagnostic Flow

import {
  DIAGNOSTIC_TREE,
  DEFAULT_CRITERIA_STATE,
  evaluateDiagnosticCriteria,
  enrichDiagnosisNode,
} from '../frontend/src/lib/solarDiagnosticEngine.js'

const mockPurchase = {
  id: 101,
  product_name: 'Aviation Aluminum Solar Road Light 300W',
  watt: 300,
  serial_number: 'SN-SOL-2026-300W-01',
  is_warranty_active: true,
  warranty_months: 24,
  branch_location: 'Quiapo',
}

console.log('--- RUNNING DIAGNOSTIC WIZARD AUTOMATED TESTS ---')

// 1. Verify ROOT node options
const root = DIAGNOSTIC_TREE.ROOT
console.log(`[TEST 1] ROOT node exists with ${root.options.length} primary symptoms.`)
if (!root.options || root.options.length < 6) {
  throw new Error('ROOT options are incomplete.')
}

// 2. Test Flow 1: Branch 1 (No Power) -> Electrical -> Enclosure -> Environment -> EVALUATE_CRITERIA
console.log('[TEST 2] Testing Branch 1 (No Power) multi-stage progression...')
const optSymptom = root.options.find((o) => o.next === 'SYMPTOM_NO_POWER')
if (!optSymptom) throw new Error('SYMPTOM_NO_POWER option missing.')

let criteria = { ...DEFAULT_CRITERIA_STATE, ...optSymptom.criteriaPatch }
const nodeStep1 = DIAGNOSTIC_TREE[optSymptom.next]
console.log(`  Step 1 Question: ${nodeStep1.title}`)

const optElec = nodeStep1.options[0] // e.g. dark LED
criteria = { ...criteria, ...optElec.criteriaPatch }
const nodeStep2 = DIAGNOSTIC_TREE[optElec.next] // CRIT_NP_PHYSICAL
console.log(`  Step 2 Question: ${nodeStep2.title}`)

const optPhys = nodeStep2.options[1] // e.g. loose aviation plug
criteria = { ...criteria, ...optPhys.criteriaPatch }
const nodeStep3 = DIAGNOSTIC_TREE[optPhys.next] // CRIT_NP_ENV
console.log(`  Step 3 Question: ${nodeStep3.title}`)

const optEnv = nodeStep3.options[0] // clear sun
criteria = { ...criteria, ...optEnv.criteriaPatch }

if (optEnv.next === 'EVALUATE_CRITERIA') {
  const diagnosis = evaluateDiagnosticCriteria(criteria, mockPurchase)
  console.log(`  Verdict Generated: [${diagnosis.faultCode}] ${diagnosis.title}`)
  console.log(`  Severity: ${diagnosis.severityLabel}`)
  console.log(`  Remedy Steps Count: ${diagnosis.remedySteps?.length}`)
  console.log(`  Claim Recommended: ${diagnosis.claimRecommendation}`)

  if (!diagnosis.faultCode || !diagnosis.remedySteps || diagnosis.remedySteps.length === 0) {
    throw new Error('Evaluated criteria failed to yield valid faultCode and remedySteps.')
  }
}

// 3. Test Flow 2: Branch 2 (Short Runtime) -> Battery Aging
console.log('[TEST 3] Testing Branch 2 (Short Runtime) -> Battery Degradation...')
const optShortRuntime = root.options.find((o) => o.next === 'SYMPTOM_SHORT_RUNTIME')
const nodeSR = DIAGNOSTIC_TREE[optShortRuntime.next]
const optAged = nodeSR.options.find((o) => o.criteriaPatch?.control === 'AGED_CELLS') || nodeSR.options[1]

let criteriaSR = { ...DEFAULT_CRITERIA_STATE, ...optShortRuntime.criteriaPatch, ...optAged.criteriaPatch }
const nodeSRPhys = DIAGNOSTIC_TREE[optAged.next]
const optSRPhys = nodeSRPhys.options[0]
criteriaSR = { ...criteriaSR, ...optSRPhys.criteriaPatch }
const nodeSREnv = DIAGNOSTIC_TREE[optSRPhys.next]
const optSREnv = nodeSREnv.options.find((o) => o.criteriaPatch?.environmental === 'CLEAR_SUN') || nodeSREnv.options[0]
criteriaSR = { ...criteriaSR, ...optSREnv.criteriaPatch }

const diagSR = evaluateDiagnosticCriteria(criteriaSR, mockPurchase)
console.log(`  Verdict Generated: [${diagSR.faultCode}] ${diagSR.title}`)
console.log(`  Confidence: ${diagSR.confidence}`)
console.log(`  Warranty Assessment: ${diagSR.warrantyEvaluation?.verdictLabel}`)

// 4. Test Direct Leaf Node Enrichment
console.log('[TEST 4] Testing Direct Leaf Node Enrichment (e.g. DIAG_OPEN_CIRCUIT)...')
const directNode = DIAGNOSTIC_TREE.DIAG_OPEN_CIRCUIT
const enriched = enrichDiagnosisNode('DIAG_OPEN_CIRCUIT', directNode, mockPurchase, criteria)
console.log(`  Enriched Fault: ${enriched.faultCode} | Telemetry PV: ${enriched.telemetry.pvEfficiency}`)
if (!enriched.telemetry || !enriched.remedySteps) {
  throw new Error('Direct leaf node enrichment missing telemetry or remedySteps.')
}

console.log('--- ALL DIAGNOSTIC ENGINE TESTS PASSED SUCCESSFULLY! ---')
