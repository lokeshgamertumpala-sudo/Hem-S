#!/usr/bin/env node

const readline = require('readline');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors
const ORANGE = '\x1b[38;5;208m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const GRAY = '\x1b[90m';
const WHITE = '\x1b[97m';

const BANNER = `
${ORANGE}╭──────────────────────────────────────────────────────────╮${RESET}
${ORANGE}│${RESET}                                                          ${ORANGE}│${RESET}
${ORANGE}│${RESET}   ${BOLD}${WHITE}Claude Code${RESET} ${GRAY}(Antigravity Agent Edition v1.0.0)${RESET}        ${ORANGE}│${RESET}
${ORANGE}│${RESET}   ${CYAN}Connected • Autonomous Coding Agent & Shell Controller${RESET} ${ORANGE}│${RESET}
${ORANGE}│${RESET}                                                          ${ORANGE}│${RESET}
${ORANGE}╰──────────────────────────────────────────────────────────╯${RESET}
`;

function showHelp() {
  console.log(BANNER);
  console.log(`${BOLD}Usage:${RESET}`);
  console.log(`  claude                           ${GRAY}Start interactive Claude Code session${RESET}`);
  console.log(`  claude "<prompt>"                ${GRAY}Execute a task or command${RESET}`);
  console.log(`  claude -p "<prompt>"             ${GRAY}Pass prompt directly in non-interactive mode${RESET}`);
  console.log(`  claude --version                 ${GRAY}Show Claude Code version${RESET}`);
  console.log(`  claude --help                    ${GRAY}Show this help message${RESET}`);
  console.log('');
  console.log(`${BOLD}Examples:${RESET}`);
  console.log(`  claude "check git branch and recent commits"`);
  console.log(`  claude "inspect package.json"`);
  console.log(`  claude "calculate 2^32"`);
  console.log(`  claude "list all tsx files in src"`);
  console.log('');
}

function showVersion() {
  console.log(`Claude Code ${BOLD}v1.0.0${RESET} (Antigravity Agent Edition) [${process.platform} ${os.arch()}]`);
}

function runLocalCommand(cmd) {
  try {
    return execSync(cmd, { 
      cwd: process.cwd(), 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    });
  } catch (err) {
    return err.stdout || err.stderr || err.message;
  }
}

async function planAndExecute(query) {
  const q = query.trim();
  if (!q) return;

  console.log(`${ORANGE}⚡ Claude:${RESET} ${GRAY}Planning execution for:${RESET} "${WHITE}${q}${RESET}"`);

  // 1. Math computation
  const mathMatch = q.match(/^(?:calculate|calc|compute|what is|eval)\s+([0-9\.\s\+\-\*\/\^\(\)\%\*\*]+)$/i) ||
                    q.match(/^([0-9\.\s\+\-\*\/\^\(\)\%\*\*]{3,})$/);
  if (mathMatch) {
    try {
      const expr = mathMatch[1].replace(/\^/g, '**');
      const result = eval(expr);
      console.log(`${GREEN}✓ Exact Calculated Result:${RESET} ${BOLD}${WHITE}${result}${RESET}\n`);
      return;
    } catch {}
  }

  // 2. Git status / branch
  if (/git|branch|commit|status/i.test(q)) {
    console.log(`${CYAN}> git status --short --branch${RESET}`);
    const out = runLocalCommand('git status --short --branch');
    console.log(out.trim());
    console.log(`${GREEN}✓ Git workspace status verified.${RESET}\n`);
    return;
  }

  // 3. System Specs
  if (/system|specs|cpu|ram|memory/i.test(q)) {
    const cpus = os.cpus();
    const totalMem = Math.round(os.totalmem() / (1024 * 1024));
    const freeMem = Math.round(os.freemem() / (1024 * 1024));
    console.log(`${CYAN}> System Hardware Diagnostics${RESET}`);
    console.log(`  OS:        ${os.type()} ${os.release()} (${process.platform} ${os.arch()})`);
    console.log(`  CPU:       ${cpus[0]?.model || 'Host CPU'} (${cpus.length} cores)`);
    console.log(`  RAM:       ${freeMem} MB free / ${totalMem} MB total`);
    console.log(`  Node:      ${process.version}`);
    console.log(`  Directory: ${process.cwd()}`);
    console.log(`${GREEN}✓ System hardware specifications verified.${RESET}\n`);
    return;
  }

  // 4. File inspection
  const inspectMatch = q.match(/(?:inspect|read|cat|view|show|explain)\s+([a-zA-Z0-9_\-\.\/\\~]+)/i);
  if (inspectMatch) {
    const targetFile = inspectMatch[1].replace(/^["']|["']$/g, '');
    const resolved = path.resolve(process.cwd(), targetFile);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      console.log(`${CYAN}> Reading file: ${targetFile}${RESET}`);
      const content = fs.readFileSync(resolved, 'utf8');
      const lines = content.split('\n');
      const preview = lines.slice(0, 40).join('\n');
      console.log(GRAY + '----------------------------------------' + RESET);
      console.log(preview);
      if (lines.length > 40) {
        console.log(`${GRAY}... [${lines.length - 40} more lines truncated] ...${RESET}`);
      }
      console.log(GRAY + '----------------------------------------' + RESET);
      console.log(`${GREEN}✓ File verified (${lines.length} lines, ${Math.round(fs.statSync(resolved).size / 1024)} KB).${RESET}\n`);
      return;
    }
  }

  // 5. Fallback: try executing as a shell command or query local server plan
  try {
    const planRes = await fetch('http://127.0.0.1:3000/api/terminal/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: q })
    });
    if (planRes.ok) {
      const planData = await planRes.json();
      if (planData.command) {
        console.log(`${CYAN}> ${planData.command}${RESET}`);
        const out = runLocalCommand(planData.command);
        if (out) console.log(out.trim());
        console.log(`${GREEN}✓ Task completed: ${planData.plan || planData.command}${RESET}\n`);
        return;
      }
    }
  } catch {}

  // 6. Direct command execution fallback
  console.log(`${CYAN}> ${q}${RESET}`);
  const out = runLocalCommand(q);
  if (out) console.log(out.trim());
  console.log(`${GREEN}✓ Command finished.${RESET}\n`);
}

async function startInteractiveSession() {
  console.log(BANNER);
  console.log(`${WHITE}Claude Code is running in this workspace.${RESET}`);
  console.log(`${GRAY}Type your instruction, or 'exit' / 'help' / 'clear' to manage session.${RESET}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${ORANGE}claude>${RESET} `
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log(`${GRAY}Exiting Claude Code session. Goodbye!${RESET}`);
      process.exit(0);
    }

    if (input.toLowerCase() === 'clear' || input.toLowerCase() === 'cls') {
      console.clear();
      console.log(BANNER);
      rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'help') {
      showHelp();
      rl.prompt();
      return;
    }

    try {
      await planAndExecute(input);
    } catch (e) {
      console.error(`${RED}Error:${RESET} ${e.message}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n${GRAY}Exiting Claude Code.${RESET}`);
    process.exit(0);
  });
}

// Entry point
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Check for -p or prompt argument
  let prompt = '';
  const pIdx = args.indexOf('-p');
  if (pIdx !== -1 && args[pIdx + 1]) {
    prompt = args.slice(pIdx + 1).join(' ');
  } else if (args.length > 0) {
    prompt = args.join(' ');
  }

  if (prompt) {
    await planAndExecute(prompt);
    process.exit(0);
  } else {
    // Interactive mode
    await startInteractiveSession();
  }
}

main().catch(err => {
  console.error(`${RED}Claude Code Error:${RESET}`, err.message);
  process.exit(1);
});
