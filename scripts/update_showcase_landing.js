const fs = require('fs');
const path = require('path');

const recordingsDir = path.join(__dirname, '..', 'recordings');
const targetFile = path.join(__dirname, '..', 'apps', 'web', 'src', 'components', 'ShowcaseLanding.tsx');

// Load generated high-fidelity JSONs
const lowData = JSON.parse(fs.readFileSync(path.join(recordingsDir, 'simple_reasoning_demo.json'), 'utf8'));
const medData = JSON.parse(fs.readFileSync(path.join(recordingsDir, 'tool_agent_demo.json'), 'utf8'));
const highData = JSON.parse(fs.readFileSync(path.join(recordingsDir, 'hallucination_correction_demo.json'), 'utf8'));

// Format to clean JS arrays, stripping parentId if it is null
const formatEvents = (data) => {
  const processed = data.events.map(ev => {
    const copy = { ...ev };
    if (copy.parentId === null) {
      delete copy.parentId;
    }
    return copy;
  });
  return JSON.stringify(processed, null, 2);
};

// Load original ShowcaseLanding file content
let showcaseContent = fs.readFileSync(targetFile, 'utf8');

// Build new DEMOS definition
const newDemosDefinition = `const DEMOS: Record<string, { title: string; description: string; events: AetherEvent[] }> = {
  simple: {
    title: "Simple Reasoning",
    description: "Introductory 12-node quantum computing tutor trace demonstrating node birth & token streaming.",
    events: ${formatEvents(lowData)}
  },
  tool: {
    title: "Multi-Tool Agent",
    description: "Model fine-tuning research agent with latency tracing, memory databases, and parallel loops.",
    events: ${formatEvents(medData)}
  },
  hallucination: {
    title: "Hallucination & Correction",
    description: "Critical DevOps deployment intervention, red alert rupture slowdown, self-correction, and recovery.",
    events: ${formatEvents(highData)}
  }
};`;

// Replace using regex or simple split
const startMarker = 'const DEMOS: Record<string, { title: string; description: string; events: AetherEvent[] }> = {';
const endMarker = '};';

const startIndex = showcaseContent.indexOf(startMarker);
if (startIndex === -1) {
  console.error("Could not find start marker in ShowcaseLanding.tsx");
  process.exit(1);
}

// Find matching ending brace
let braceCount = 1;
let endIndex = -1;
for (let i = startIndex + startMarker.length; i < showcaseContent.length; i++) {
  if (showcaseContent[i] === '{') braceCount++;
  if (showcaseContent[i] === '}') braceCount--;
  if (braceCount === 0) {
    endIndex = i + 1; // include closing semicolon if there is one
    break;
  }
}

if (endIndex === -1) {
  console.error("Could not find matching closing brace in ShowcaseLanding.tsx");
  process.exit(1);
}

const before = showcaseContent.slice(0, startIndex);
const after = showcaseContent.slice(endIndex);
const updatedContent = before + newDemosDefinition + after;

fs.writeFileSync(targetFile, updatedContent, 'utf8');
console.log("✔ Successfully updated ShowcaseLanding.tsx with high-fidelity cinematic traces!");
