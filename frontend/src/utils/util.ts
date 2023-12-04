import letterAspectRatio from '@/utils/letterAspectRatio';
import {
  Point,
  RectDef,
  specificIssueTypes,
  undetectedIssueTypes,
  selectedNodeInfo,
  typeShortMapFull,
  nodeBubbleDesc,
} from '@/utils/types';
import {
  BubbleSet, PointPath, ShapeSimplifier, BSplineShapeGenerator,
} from '@/utils/bubblesets';

export function AincludeB(A: Array<any>, B: Array<any>): boolean {
  return B.every((val: any) => A.includes(val));
}

const getLetterWidth = (
  letter: string,
  fontSize: number,
) => fontSize * (letterAspectRatio[letter as keyof typeof letterAspectRatio] || 1);

const getTextSize = (text: string, fontSize: number) => {
  let width = 0;
  // eslint-disable-next-line prefer-regex-literals
  const pattern = new RegExp('[\u4E00-\u9FFF]+');
  text.split('')
    .forEach((letter) => {
      if (pattern.test(letter)) {
        // 中文字符
        width += fontSize;
      } else {
        width += getLetterWidth(letter, fontSize);
      }
    });
  return [width, fontSize];
};

export const fittingString = (input: string, maxWidth: any, fontSize: any) => {
  const ellipsis = '...';
  const ellipsisLength = getTextSize(ellipsis, fontSize)[0];
  let currentWidth = 0;
  let result = input;
  // eslint-disable-next-line prefer-regex-literals
  const pattern = new RegExp('[\u4E00-\u9FFF]+');
  input.split('')
    .forEach((letter: string, i) => {
      if (currentWidth > maxWidth - ellipsisLength) {
        return;
      }
      if (pattern.test(letter)) {
        // Chinese charactors
        currentWidth += fontSize;
      } else {
        // get the width of single letter according to the fontSize
        currentWidth += getLetterWidth(letter, fontSize);
      }
      if (currentWidth > maxWidth - ellipsisLength) {
        result = `${input.slice(0, i)}${ellipsis}`;
      }
    });
  return result;
};

export function diagonal(source: Point, target: Point) {
  const { x, y } = source;
  const { x: ex, y: ey } = target;

  const xrvs = ex - x < 0 ? -1 : 1;
  const yrvs = ey - y < 0 ? -1 : 1;

  const rdef = 5;
  let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef;

  r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r;

  const h = Math.abs(ey - y) / 2 - r;
  const w = Math.abs(ex - x) - r * 2;
  // w=0;
  const path = `
      M ${x} ${y}
      L ${x} ${y + h * yrvs}
      C  ${x} ${y + h * yrvs + r * yrvs} ${x} ${y + h * yrvs + r * yrvs} ${x + r * xrvs} ${y + h * yrvs + r * yrvs}
      L ${x + w * xrvs + r * xrvs} ${y + h * yrvs + r * yrvs}
      C  ${ex}  ${y + h * yrvs + r * yrvs} ${ex}  ${y + h * yrvs + r * yrvs} ${ex} ${ey - h * yrvs}
      L ${ex} ${ey}
`;
  return path;
}

export function hdiagonal(source: Point, target: Point) {
  const { x, y } = source;
  const { x: ex, y: ey } = target;

  // Values in case of top reversed and left reversed diagonals
  const xrvs = ex - x < 0 ? -1 : 1;
  const yrvs = ey - y < 0 ? -1 : 1;

  // Define preferred curve radius
  const rdef = 5;

  // Reduce curve radius, if source-target x space is smaller
  let r = Math.abs(ex - x) / 2 < rdef ? Math.abs(ex - x) / 2 : rdef;

  // Further reduce curve radius, is y space is more small
  r = Math.abs(ey - y) / 2 < r ? Math.abs(ey - y) / 2 : r;

  // Define width and height of link, excluding radius
  // const h = Math.abs(ey - y) / 2 - r;
  const w = Math.abs(ex - x) / 2 - r;

  // Build and return custom arc command
  return `
      M ${x} ${y}
      L ${x + w * xrvs} ${y}
      C ${x + w * xrvs + r * xrvs} ${y}
        ${x + w * xrvs + r * xrvs} ${y}
        ${x + w * xrvs + r * xrvs} ${y + r * yrvs}
      L ${x + w * xrvs + r * xrvs} ${ey - r * yrvs}
      C ${x + w * xrvs + r * xrvs}  ${ey}
        ${x + w * xrvs + r * xrvs}  ${ey}
        ${ex - w * xrvs}  ${ey}
      L ${ex} ${ey}
  `;
}

export function customRectCorner(rectInfo: RectDef) {
  const {
    startx, starty, rectWidth, rectHeight, rounded, radius,
  } = rectInfo;
  let path;

  switch (rounded) {
    case 'left':
      path = `
      M${startx + radius},${starty + radius}
      a${radius},${radius} 0 0 1 ${radius},-${radius}
      h${rectWidth - radius}
      v${rectHeight}
      h${-rectWidth + radius}
      a${radius},${radius} 0 0 1 -${radius},-${radius}
      z
      `;
      break;
    case 'right':
      path = `
      M${startx},${starty}
      h${rectWidth - radius}
      a${radius},${radius} 0 0 1 ${radius},${radius}
      v${rectHeight - 2 * radius}
      a${radius},${radius} 0 0 1 ${-radius},${radius}
      h ${radius - rectWidth}
      z
      `;
      break;
    case 'top':
      path = `
      M${startx},${starty + radius}
      a${radius},${radius} 0 0 1 ${radius},-${radius}
      h${rectWidth - 2 * radius}
      a${radius},${radius} 0 0 1 ${radius},${radius}
      v${rectHeight - radius}
      h${-rectWidth}
      z`;
      break;
    case 'bottom':
      path = `
      M${startx},${starty}
      h${rectWidth}
      v${rectHeight - radius}
      a${radius},${radius} 0 0 1 ${-radius},${radius}
      h${-rectWidth + 2 * radius}
      a${radius},${radius} 0 0 1 -${radius},-${radius}
      z`;
      break;
    case 'all': // 936
      path = `
      M${startx},${starty + radius}
      a${radius},${radius} 0 0 1 ${radius},-${radius}
      h${rectWidth - 2 * radius}
      a${radius},${radius} 0 0 1 ${radius},${radius}
      v${rectHeight - 2 * radius}
      a${radius},${radius} 0 0 1 ${-radius},${radius}
      h${-rectWidth + 2 * radius}
      a${radius},${radius} 0 0 1 -${radius},-${radius}
      z`;
      break;
    default: {
      path = `
      M${startx},${starty}
      h${rectWidth}
      v${rectHeight}
      h${-rectWidth}
      v${-rectHeight}
      z
      `;
      break;
    }
  }

  return path;
}

export const extractTranslateXY = (nodeInfo: HTMLElement) => {
  const s = nodeInfo.getAttribute('transform');
  if (!s) return [0, 0];
  const xy = s.match(/(-)?\d+(\.\d+)?/g)
    ?.map((v: string) => parseInt(v, 10));
  return xy;
};

const isArr = (s: string) => s === '[]';

export const generateDescription = (desc: Array<string>, type: string, formatter: 'html' | 'rich' = 'html') : string => {
  let res;

  let wrap = (s: string) => (`<i>${s}</i>`);
  if (formatter === 'rich') {
    wrap = (s: string) => (`{i|${s}}`); // 此处的i应当与issueDetail中定义的tag一致
  }

  switch (type) {
    case specificIssueTypes.incorrectDataType:
    case specificIssueTypes.inconsitentType:
    case specificIssueTypes.emptyValue:
    case specificIssueTypes.redundantPadding:
    case specificIssueTypes.missingValue: {
      if (isArr(desc[0])) {
        res = `in array element of key ${wrap(desc[1])}`;
        break;
      }
      res = `in value of key ${wrap(desc[0])}`;
      break;
    }
    case specificIssueTypes.partialDuplicate:
    case specificIssueTypes.allDuplicate: {
      res = `Key: ${wrap(desc[1])}, Value: ${
        desc[2].split(',')
          .map((t: string) => (t !== 'd'
            ? typeShortMapFull[t as keyof typeof typeShortMapFull] : 'Dict'))
          .join(', ')}`;
      break;
    }
    case specificIssueTypes.dupInArray: {
      res = `in array element of key ${wrap(desc[0])}`;
      break;
    }
    case specificIssueTypes.redundantInterior: {
      res = `Parent Node: ${wrap(desc[0])}, ChildNode: ${wrap(desc[1])}`;
      break;
    }
    case specificIssueTypes.dataAssociations:
    case undetectedIssueTypes.ambiguous:
    case undetectedIssueTypes.correlated:
    case undetectedIssueTypes.disaggrement:
    case undetectedIssueTypes.dupKey:
    case undetectedIssueTypes.format:
    case undetectedIssueTypes.mislocate:
    case specificIssueTypes.inconsitentKey:
    case specificIssueTypes.hierKey:
    default: {
      res = 'in keys of ';
      res += desc.map((k: string) => wrap(k))
        .join(', ');
      break;
    }
  }
  return res;
};

export const checkShouldAble = (
  selectedNodes: Array<selectedNodeInfo>,
  issue: undetectedIssueTypes | specificIssueTypes,
): boolean => {
  const levels = new Set<number>(selectedNodes.map((node: selectedNodeInfo) => node.depth));
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);
  // issue 相关联最多连续层级
  if (levels.size > 3 || Math.abs(maxLevel - minLevel) >= 2) return false;
  switch (issue) {
    case specificIssueTypes.allDuplicate:
    case specificIssueTypes.partialDuplicate:
    case specificIssueTypes.redundantInterior: {
      if (selectedNodes.length === 2 && levels.size === 2) return true;
      return false;
    }
    case specificIssueTypes.dataAssociations:
    case specificIssueTypes.hierKey:
    case specificIssueTypes.inconsitentKey:
    case undetectedIssueTypes.dupKey:
    case undetectedIssueTypes.redundantKey:
    case undetectedIssueTypes.correlated: {
      if (levels.size === 1 && selectedNodes.length > 1) return true;
      return false;
    }
    case specificIssueTypes.redundantExterior:
    case specificIssueTypes.inconsistentStructure: {
      if (levels.size === 2 && selectedNodes.length > 2) return true;
      return false;
    }
    case specificIssueTypes.inconsitentType:
    case specificIssueTypes.incorrectDataType:
    case specificIssueTypes.fieldWithSameValue:
    case specificIssueTypes.missingValue:
    case specificIssueTypes.emptyValue:
    case specificIssueTypes.redundantPadding:
    case specificIssueTypes.dupInArray:
    case specificIssueTypes.distributionOutlier:
    case specificIssueTypes.missingKey:
    case undetectedIssueTypes.inconsistentValue:
    case undetectedIssueTypes.semanticOutlier: {
      if (levels.size === 1 && selectedNodes.length === 1) return true;
      return false;
    }
    case undetectedIssueTypes.ambiguous:
    case undetectedIssueTypes.format:
    case undetectedIssueTypes.inconsistentPad:
    case undetectedIssueTypes.mislocate:
    case undetectedIssueTypes.disaggrement: {
      return false;
    }
    default:
      break;
  }
  return false;
};

export const curateFormData = (value: string, dictSim: number, arrSim: number): FormData => {
  const contentBlob = new Blob([value], { type: 'application/json' });
  const contentfile = new File([contentBlob], 'file.json', { type: 'application/json' });

  const formData = new FormData();
  formData.append('file', contentfile);
  formData.append('arrSim', `${arrSim}`);
  formData.append('dictSim', `${dictSim}`);
  return formData;
};

export const generateLogInfo = (
  issueType: undetectedIssueTypes | specificIssueTypes,
  description: string,
  transform: string,
) => (
  `Fix the issue <span style="color: red;">${issueType}</span> ${description} by the transformation <span style="color: green;">${transform}</span>`
);

export function doBubbles(
  nodeInBubble: Array<nodeBubbleDesc>,
  nodeOutBubble: Array<nodeBubbleDesc>,
) {
  const bubbles = new BubbleSet();
  const list = bubbles.createOutline(
    BubbleSet.addPadding(nodeInBubble, 5),
    BubbleSet.addPadding(nodeOutBubble, 5),
    null,
  );

  const outline = new PointPath(list)
    .transform([
      new ShapeSimplifier(0.0),
      new BSplineShapeGenerator(),
      new ShapeSimplifier(0.0),
    ]);
  return outline;
}
const regex = /\s+/g;

export const areStringEqual = (str1: string, str2: string) => (str1.replace(regex, '') === str2.replace(regex, ''));
