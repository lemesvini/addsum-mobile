const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const GRAY = "\x1b[90m";
const WHITE = "\x1b[97m";

const tag = {
  ok: (t) => `${GREEN}${BOLD}✔${RESET} ${WHITE}${t}${RESET}`,
  step: (t) => `  ${CYAN}›${RESET} ${t}`,
  sub: (t) => `    ${GRAY}${t}${RESET}`,
  warn: (t) => `${YELLOW}⚠${RESET}  ${YELLOW}${t}${RESET}`,
  err: (t) => `${RED}✖${RESET}  ${RED}${BOLD}${t}${RESET}`,
  dim: (t) => `${DIM}${t}${RESET}`,
};

module.exports = {
  tag,
  BOLD,
  DIM,
  GREEN,
  YELLOW,
  CYAN,
  RED,
  GRAY,
  WHITE,
  RESET,
};
