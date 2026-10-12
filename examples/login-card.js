// Load all Inter weights we'll need (must load BEFORE setting text)
const fontRegular = { family: "Inter", style: "Regular" };
const fontMedium  = { family: "Inter", style: "Medium" };
const fontSemiBold = { family: "Inter", style: "Semi Bold" };
const fontBold    = { family: "Inter", style: "Bold" };
await Promise.all([
  figma.loadFontAsync(fontRegular),
  figma.loadFontAsync(fontMedium),
  figma.loadFontAsync(fontSemiBold),
  figma.loadFontAsync(fontBold),
]);

// Find a clear position to the right of existing nodes
const existing = figma.currentPage.children;
let baseX = 200, baseY = 200;
if (existing.length > 0) {
  const rightmost = existing.reduce((m, c) => Math.max(m, c.x + (c.width || 0)), 0);
  baseX = rightmost + 200;
}

function makeText(content, fontSize, font, color, opts = {}) {
  const t = figma.createText();
  t.fontName = font;
  t.fontSize = fontSize;
  t.characters = content;
  t.fills = [{ type: "SOLID", color }];
  if (opts.align) t.textAlignHorizontal = opts.align;
  if (opts.letterSpacing != null) t.letterSpacing = { unit: "PERCENT", value: opts.letterSpacing };
  return t;
}

const created = [];

// ============ Outer card (auto-layout vertical) ============
const card = figma.createFrame();
card.name = "Login Card";
card.layoutMode = "VERTICAL";
card.primaryAxisSizingMode = "AUTO";
card.counterAxisSizingMode = "FIXED";
card.itemSpacing = 14;
card.paddingTop = 36;
card.paddingBottom = 36;
card.paddingLeft = 32;
card.paddingRight = 32;
card.resize(380, 100);  // explicit width; height auto from content
card.cornerRadius = 20;
card.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
card.strokes = [{ type: "SOLID", color: { r: 0.9, g: 0.91, b: 0.93 } }];
card.strokeWeight = 1;
card.effects = [{
  type: "DROP_SHADOW",
  color: { r: 0, g: 0, b: 0, a: 0.06 },
  offset: { x: 0, y: 8 },
  radius: 24,
  spread: -4,
  visible: true,
  blendMode: "NORMAL",
}];
card.x = baseX;
card.y = baseY;

// ============ Logo placeholder (gradient square) ============
const logo = figma.createFrame();
logo.name = "Logo";
logo.layoutMode = "HORIZONTAL";
logo.primaryAxisAlignItems = "CENTER";
logo.counterAxisAlignItems = "CENTER";
logo.primaryAxisSizingMode = "FIXED";
logo.counterAxisSizingMode = "FIXED";
logo.resize(56, 56);
logo.cornerRadius = 16;
logo.fills = [{
  type: "GRADIENT_LINEAR",
  gradientStops: [
    { position: 0, color: { r: 0.42, g: 0.36, b: 0.95, a: 1 } },
    { position: 1, color: { r: 0.27, g: 0.55, b: 0.95, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]],
}];
const logoMark = makeText("F", 28, fontBold, { r: 1, g: 1, b: 1 });
logo.appendChild(logoMark);
card.appendChild(logo);

// ============ Spacer ============
const sp1 = figma.createFrame();
sp1.name = "spacer";
sp1.resize(1, 4);
sp1.fills = [];
card.appendChild(sp1);

// ============ Title ============
const title = makeText("Welcome back", 26, fontBold, { r: 0.08, g: 0.09, b: 0.15 }, { align: "CENTER" });
card.appendChild(title);
title.layoutSizingHorizontal = "FILL";  // ← append 之后再设 FILL

// ============ Subtitle ============
const subtitle = makeText("Sign in to continue to your dashboard", 14, fontRegular, { r: 0.45, g: 0.47, b: 0.53 }, { align: "CENTER" });
card.appendChild(subtitle);
subtitle.layoutSizingHorizontal = "FILL";

// ============ Spacer ============
const sp2 = figma.createFrame();
sp2.resize(1, 8);
sp2.fills = [];
card.appendChild(sp2);

// ============ Email input ============
function makeInput(labelText, placeholder) {
  // label
  const label = makeText(labelText, 12, fontSemiBold, { r: 0.35, g: 0.37, b: 0.42 }, { letterSpacing: 2 });
  // input field
  const field = figma.createFrame();
  field.name = placeholder;
  field.layoutMode = "HORIZONTAL";
  field.counterAxisAlignItems = "CENTER";
  field.paddingTop = 12;
  field.paddingBottom = 12;
  field.paddingLeft = 14;
  field.paddingRight = 14;
  field.cornerRadius = 10;
  field.fills = [{ type: "SOLID", color: { r: 0.965, g: 0.97, b: 0.98 } }];
  field.strokes = [{ type: "SOLID", color: { r: 0.85, g: 0.87, b: 0.91 } }];
  field.strokeWeight = 1;
  const ph = makeText(placeholder, 14, fontRegular, { r: 0.62, g: 0.65, b: 0.7 });
  field.appendChild(ph);
  // wrap (vertical auto-layout)
  const wrap = figma.createFrame();
  wrap.name = labelText;
  wrap.layoutMode = "VERTICAL";
  wrap.primaryAxisSizingMode = "AUTO";
  wrap.counterAxisSizingMode = "FIXED";
  wrap.itemSpacing = 6;
  wrap.fills = [];
  return { wrap, label, field };
}

const email = makeInput("EMAIL", "you@example.com");
card.appendChild(email.wrap);
email.wrap.layoutSizingHorizontal = "FILL";
email.wrap.appendChild(email.label);
email.wrap.appendChild(email.field);
email.field.layoutSizingHorizontal = "FILL";

const pw = makeInput("PASSWORD", "Enter your password");
card.appendChild(pw.wrap);
pw.wrap.layoutSizingHorizontal = "FILL";
pw.wrap.appendChild(pw.label);
pw.wrap.appendChild(pw.field);
pw.field.layoutSizingHorizontal = "FILL";

// ============ Forgot password link ============
const forgot = figma.createFrame();
forgot.name = "Forgot";
forgot.layoutMode = "HORIZONTAL";
forgot.primaryAxisAlignItems = "MAX";  // right-align content
forgot.fills = [];
const forgotText = makeText("Forgot password?", 12, fontMedium, { r: 0.4, g: 0.4, b: 0.95 });
forgot.appendChild(forgotText);
card.appendChild(forgot);
forgot.layoutSizingHorizontal = "FILL";

// ============ Spacer ============
const sp3 = figma.createFrame();
sp3.resize(1, 4);
sp3.fills = [];
card.appendChild(sp3);

// ============ Sign in button ============
const button = figma.createFrame();
button.name = "Sign In Button";
button.layoutMode = "HORIZONTAL";
button.primaryAxisAlignItems = "CENTER";
button.counterAxisAlignItems = "CENTER";
button.paddingTop = 14;
button.paddingBottom = 14;
button.cornerRadius = 10;
button.fills = [{
  type: "GRADIENT_LINEAR",
  gradientStops: [
    { position: 0, color: { r: 0.4, g: 0.36, b: 0.95, a: 1 } },
    { position: 1, color: { r: 0.27, g: 0.55, b: 0.95, a: 1 } },
  ],
  gradientTransform: [[1, 0, 0], [0, 1, 0]],
}];
button.effects = [{
  type: "DROP_SHADOW",
  color: { r: 0.4, g: 0.36, b: 0.95, a: 0.35 },
  offset: { x: 0, y: 4 },
  radius: 12,
  spread: 0,
  visible: true,
  blendMode: "NORMAL",
}];
const btnText = makeText("Sign In", 15, fontSemiBold, { r: 1, g: 1, b: 1 }, { letterSpacing: 2 });
button.appendChild(btnText);
card.appendChild(button);
button.layoutSizingHorizontal = "FILL";

// ============ Sign up row ============
const signUpRow = figma.createFrame();
signUpRow.name = "SignUpRow";
signUpRow.layoutMode = "HORIZONTAL";
signUpRow.primaryAxisAlignItems = "CENTER";
signUpRow.counterAxisAlignItems = "CENTER";
signUpRow.itemSpacing = 6;
signUpRow.fills = [];
const su1 = makeText("Don't have an account?", 13, fontRegular, { r: 0.45, g: 0.47, b: 0.53 });
const su2 = makeText("Sign up", 13, fontSemiBold, { r: 0.4, g: 0.4, b: 0.95 });
signUpRow.appendChild(su1);
signUpRow.appendChild(su2);
card.appendChild(signUpRow);
signUpRow.layoutSizingHorizontal = "FILL";

return {
  createdNodeIds: [card.id],
  cardId: card.id,
  cardName: card.name,
  page: figma.currentPage.name,
};
