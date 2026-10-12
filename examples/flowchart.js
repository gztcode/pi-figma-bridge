// Flowchart example — 5 个节点 + 4 条箭头连线
// 演示 use_figma 进阶用法：layoutMode 切换 / clone fills / connector API

const fontRegular = { family: "Inter", style: "Regular" };
const fontSemiBold = { family: "Inter", style: "Semi Bold" };
const fontBold = { family: "Inter", style: "Bold" };
await Promise.all([
  figma.loadFontAsync(fontRegular),
  figma.loadFontAsync(fontSemiBold),
  figma.loadFontAsync(fontBold),
]);

// 找右侧空位
const existing = figma.currentPage.children;
let baseX = 200, baseY = 200;
if (existing.length > 0) {
  const rightmost = existing.reduce((m, c) => Math.max(m, c.x + (c.width || 0)), 0);
  baseX = rightmost + 200;
}

function makeText(content, fontSize, font, color) {
  const t = figma.createText();
  t.fontName = font;
  t.fontSize = fontSize;
  t.characters = content;
  t.fills = [{ type: "SOLID", color }];
  return t;
}

// 通用节点构造器
function makeNode(label, x, y, color) {
  const f = figma.createFrame();
  f.name = label;
  f.layoutMode = "VERTICAL";
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.primaryAxisAlignItems = "CENTER";
  f.counterAxisAlignItems = "CENTER";
  f.paddingTop = 18;
  f.paddingBottom = 18;
  f.paddingLeft = 28;
  f.paddingRight = 28;
  f.cornerRadius = 12;
  f.fills = [{ type: "SOLID", color }];
  f.x = x;
  f.y = y;

  const t = makeText(label, 14, fontSemiBold, { r: 1, g: 1, b: 1 });
  f.appendChild(t);
  return f;
}

// 4 个节点 (左上 -> 右上 -> 右下 -> 左下 -> 中间)
const start = makeNode("Start",       baseX,         baseY,         { r: 0.16, g: 0.6,  b: 0.4  });
const input = makeNode("Get Input",   baseX + 220,   baseY,         { r: 0.2,  g: 0.45, b: 0.85 });
const check = makeNode("Valid?",      baseX + 440,   baseY,         { r: 0.95, g: 0.6,  b: 0.15 });
const proc  = makeNode("Process",     baseX + 440,   baseY + 120,   { r: 0.4,  g: 0.4,  b: 0.95 });
const end   = makeNode("End",         baseX + 220,   baseY + 240,   { r: 0.55, g: 0.4,  b: 0.4  });

[ start, input, check, proc, end ].forEach(n => figma.currentPage.appendChild(n));

// 用 connector (figma.createConnector) 画箭头
function makeArrow(from, to, label) {
  const c = figma.createConnector();
  c.connectorLineType = "STRAIGHT";
  c.strokeWeight = 2;
  c.strokes = [{ type: "SOLID", color: { r: 0.4, g: 0.4, b: 0.45 } }];
  c.arrowheadStart = "NONE";
  c.arrowheadEnd = "ARROW_LINES";
  // 端点 = 两个节点的中心
  c.startPoint = { x: from.x + from.width, y: from.y + from.height / 2 };
  c.endPoint =   { x: to.x,                y: to.y   + to.height / 2 };
  figma.currentPage.appendChild(c);

  if (label) {
    const t = makeText(label, 11, fontRegular, { r: 0.5, g: 0.5, b: 0.55 });
    t.x = (c.startPoint.x + c.endPoint.x) / 2 - 20;
    t.y = (c.startPoint.y + c.endPoint.y) / 2 - 8;
    figma.currentPage.appendChild(t);
  }
  return c;
}

const a1 = makeArrow(start, input, "");
const a2 = makeArrow(input, check, "");
const a3 = makeArrow(check, proc,  "yes");
const a4 = makeArrow(check, end,   "no");
const a5 = makeArrow(proc,  end,   "");

return {
  createdNodeIds: [start.id, input.id, check.id, proc.id, end.id,
                   a1.id, a2.id, a3.id, a4.id, a5.id],
  flowchartId: figma.currentPage.id,
};
