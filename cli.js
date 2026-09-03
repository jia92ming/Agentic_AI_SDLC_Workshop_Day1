#!/usr/bin/env node

const apiBase = (process.env.SNIP_API || 'http://localhost:3000').replace(/\/+$/, '');

function usage() {
  console.log(`Usage:
  snip add <url>    Create a short link
  snip ls           List all links
  snip open <code>  Open a short link in your browser
  snip help         Show this help message`);
}

function validUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${apiBase}${path}`, options);
  } catch {
    throw new Error(`Could not reach the Snip API at ${apiBase}.`);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  const manualRedirect = options && options.redirect === 'manual';
  if (!response.ok && !(manualRedirect && response.status >= 300 && response.status < 400)) {
    throw new Error(body.error || `API request failed with status ${response.status}.`);
  }
  return { response, body };
}

async function add(url) {
  if (!validUrl(url)) {
    throw new Error('Please provide a valid http:// or https:// URL.');
  }
  const { body } = await request('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });
  console.log(body.shortUrl);
}

async function list() {
  const { body: links } = await request('/api/links');
  if (links.length === 0) {
    console.log('No links yet.');
    return;
  }

  const rows = links.map((link) => [link.code, String(link.hits), link.url]);
  const widths = rows[0].map((_, index) =>
    Math.max(...rows.map((row) => row[index].length), ['CODE', 'HITS', 'URL'][index].length)
  );
  const format = (row) => row.map((value, index) => value.padEnd(widths[index])).join('  ');
  console.log(format(['CODE', 'HITS', 'URL']));
  console.log(format(widths.map((width) => '-'.repeat(width))));
  rows.forEach((row) => console.log(format(row)));
}

async function open(code) {
  if (!/^[A-Za-z0-9]{6}$/.test(code)) {
    throw new Error('Please provide a six-character short-link code.');
  }
  const { response } = await request(`/${encodeURIComponent(code)}`, { redirect: 'manual' });
  const target = response.headers.get('location');
  if (!target) {
    throw new Error('The API did not return a redirect target.');
  }

  const command = process.platform === 'win32'
    ? ['cmd', ['/c', 'start', '', target]]
    : process.platform === 'darwin'
      ? ['open', [target]]
      : ['xdg-open', [target]];
  const { spawn } = require('node:child_process');
  const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore' });
  child.unref();
  console.log(target);
}

async function main() {
  const [command, argument] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    usage();
    return;
  }

  if (command === 'add' && argument) return add(argument);
  if (command === 'ls' && !argument) return list();
  if (command === 'open' && argument) return open(argument);
  throw new Error('Invalid command or missing argument.\n');
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
