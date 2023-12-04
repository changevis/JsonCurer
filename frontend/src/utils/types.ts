import { BaseType } from 'd3-selection';

export interface KV {
  [key: string]: any;
}
export interface TypeNode {
  type: Array<'n'|'s'|'b'|'e'|'a'|'d'>,
  feature: {'isMultiple': boolean, 'isOption': boolean},
  key: string | null,
  children: Array<TypeNode | null>,
  id?: string,
  parentId?: string,
  typeProp: Array<number>
  parentIndex: null | number,
  data: any,
  [key: string]: any,
}

export type svgSelection = d3.Selection<BaseType, unknown, HTMLElement, any>;

export interface Point {
  x: number,
  y: number
}

export interface RectDef {
  startx: number,
  starty: number,
  rectWidth: number,
  rectHeight: number,
  rectColor: string,
  rounded: 'left' | 'right' | 'top' | 'bottom' | 'all' | 'no',
  radius: number,
  rightIcon: string,
}

export enum edgeType {
  TypeAggr = 'typeAggr',
  KeyOptional = 'keyOptional',
  ValueMultipleType = 'valueMultipleType',
  MultiPiles = 'multiPiles',
}

export enum edgeTypeMapName {
  TypeAggr = 'Multiple',
  KeyOptional = 'Optional',
  ValueMultipleType = 'Alternate',
  MultiPiles = 'Folded',
}

export interface NodeSpecificInfo {
  connectorLineColor: string,
  connectorLineWidth: number,
  dataType: string,
  parentIndex: number,
  dataTypeFeature: Array<'typeAggr' | 'keyOptional' | 'valueMultipleType'>,
  dataTypeText: null | string,
  dataTypeTextTruncated?: null | string,
  expanded: boolean,
  nodeId: number,
  nodeCircleRadius: number,
  nodeBorderRadius: number,
  nodeHeight: number,
  nodeWidth: number,
  nodeMultipleRectInfo: Array<RectDef> | [],
  nodeFillColor: string | Array<string>,
  parentNodeId: number,
  totalSubordinates: number,
  directSubordinates: number,
  shiftFromEndCenter: number,
  shiftFromStartCenter: Map<number, number>,
  attrViewType: string,
  attrViewData: Array<any>,
  piled: boolean,
}
export interface treeDrawingData {
  children: Array<treeDrawingData> | null,
  hiddenChildren?: Array<treeDrawingData> | null,
  depth: number,
  height: 3,
  id: string,
  parent: treeDrawingData,
  x: number,
  x0: number,
  y: number,
  y0: number,
  data: NodeSpecificInfo,
  // expanded: boolean,
}

export enum chartType{
  box = 'box',
  bar = 'bar',
  heatmap = 'heatmap',
  pie = 'pie',
  freqHisto = 'freqHisto',
  no = '',
}

export interface attrViewDesc {
  attrViewData: Array<any>,
  xTitle?: string,
  yTitle?: string,
  xAxisType?: string,
  hs?: Array<any>, // for heatmap
  vs?: Array<any>, // for heatmap
  titleL?: string,
  titleM?: string,
}

export interface nodeBubbleDesc {
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
}

// 列举的是可检测的issueTypes 17种
export enum specificIssueTypes {
  missingValue = 'Missing Value',
  missingKey = 'Missing Key',
  emptyValue = 'Empty Value',
  inconsitentType = 'Inconsistent Data Type',
  hierKey = 'Hierarchical Key',
  inconsitentKey = 'Inconsistent Key',
  redundantPadding = 'Redundant Padding',
  dataAssociations = 'Data Associations',
  incorrectDataType = 'Incorrect Data Type',
  partialDuplicate = 'Partial Duplicate Key-Value Pair',
  allDuplicate = 'All Duplicate Key-Value Pair',
  redundantInterior = 'Redundant Interior Structure',
  redundantExterior = 'Redundant Exterior Structure',
  dupInArray = 'Duplicate Value of an Array',
  fieldWithSameValue = 'Field With Same Value',
  inconsistentStructure = 'Inconsistent Structure',
  distributionOutlier = 'Distribution Outlier',
}
// 不可检测的Issue Type 需要声明
export enum undetectedIssueTypes {
  inconsistentValue = 'Inconsistent Value',
  dupKey = 'Duplicate Key',
  disaggrement = 'Disagreement with Reference Info',
  ambiguous = 'Ambiguous/Confusing Data Structure',
  semanticOutlier = 'Semantic Outliers',
  format = 'Data Format Converter',
  redundantKey = 'Redundant Key',
  correlated = 'Correlated Arrays',
  mislocate = 'Mislocated Key Value Pairs',
  inconsistentPad = 'Inconsistent Padding',
}

export enum generalIssueTypes {
  consistency = 'Consistency',
  duplicate = 'Duplicate',
  redundancy = 'Redundancy',
  completeness = 'Completeness',
  accuracy = 'Accuracy',
  schema = 'Schema',
}

export const issueTypeMapping = {
  [generalIssueTypes.accuracy]: 'Accuracy',
  [generalIssueTypes.redundancy]: 'Conciseness',
  [generalIssueTypes.schema]: 'Schema-Rigor',
  [generalIssueTypes.completeness]: 'Completeness',
  [generalIssueTypes.consistency]: 'Consistency',
  [generalIssueTypes.duplicate]: 'Uniqueness',
};

export type generalTypes =
  generalIssueTypes.completeness
  | generalIssueTypes.consistency
  | generalIssueTypes.redundancy
  | generalIssueTypes.duplicate
  | generalIssueTypes.schema
  | generalIssueTypes.accuracy;

export enum typeShortMapFull {
  d = 'Dictionary',
  a = 'Array',
  n = 'Number',
  s = 'String',
  b = 'Boolean',
  e = 'Null',
}

export const IssueByKVS = {
  Key: [ // 5
    specificIssueTypes.inconsitentKey,
    specificIssueTypes.missingKey,
    specificIssueTypes.hierKey,
    undetectedIssueTypes.dupKey,
    undetectedIssueTypes.redundantKey,
  ],
  Value: [ // 13
    specificIssueTypes.inconsitentType,
    specificIssueTypes.redundantPadding,
    specificIssueTypes.dupInArray,
    specificIssueTypes.fieldWithSameValue,
    specificIssueTypes.emptyValue,
    specificIssueTypes.incorrectDataType,
    specificIssueTypes.distributionOutlier,
    undetectedIssueTypes.semanticOutlier,
    undetectedIssueTypes.disaggrement,
    undetectedIssueTypes.ambiguous,
    undetectedIssueTypes.inconsistentValue,
    undetectedIssueTypes.inconsistentPad,
    specificIssueTypes.missingValue,
  ],
  'K-V Pair': [ // 5
    specificIssueTypes.partialDuplicate,
    specificIssueTypes.allDuplicate,
    specificIssueTypes.dataAssociations,
    undetectedIssueTypes.correlated,
    undetectedIssueTypes.mislocate,
  ],
  Structure: [ // 4
    specificIssueTypes.inconsistentStructure,
    specificIssueTypes.redundantExterior,
    specificIssueTypes.redundantInterior,
    undetectedIssueTypes.format,
  ],
};

// 用于context menu菜单渲染
export const IssueBySixCategory = {
  [generalIssueTypes.consistency]: [ // 5
    specificIssueTypes.inconsitentKey,
    undetectedIssueTypes.inconsistentValue,
    undetectedIssueTypes.inconsistentPad,
    specificIssueTypes.inconsitentType,
    specificIssueTypes.inconsistentStructure,
  ],
  [generalIssueTypes.redundancy]: [ // 4
    undetectedIssueTypes.redundantKey,
    specificIssueTypes.redundantPadding,
    specificIssueTypes.redundantInterior,
    specificIssueTypes.redundantExterior,
  ],
  [generalIssueTypes.duplicate]: [ // 5
    specificIssueTypes.dupInArray,
    specificIssueTypes.fieldWithSameValue,
    specificIssueTypes.partialDuplicate,
    specificIssueTypes.allDuplicate,
    undetectedIssueTypes.dupKey,
  ],
  [generalIssueTypes.completeness]: [ // 3
    specificIssueTypes.missingKey,
    specificIssueTypes.missingValue,
    specificIssueTypes.emptyValue,
  ],
  [generalIssueTypes.schema]: [ // 5
    specificIssueTypes.hierKey,
    undetectedIssueTypes.ambiguous,
    specificIssueTypes.dataAssociations,
    undetectedIssueTypes.correlated,
    undetectedIssueTypes.format,
  ],
  [generalIssueTypes.accuracy]: [ // 5
    specificIssueTypes.distributionOutlier,
    undetectedIssueTypes.semanticOutlier,
    specificIssueTypes.incorrectDataType,
    undetectedIssueTypes.disaggrement,
    undetectedIssueTypes.mislocate,
  ],
};

export interface selectedNodeInfo {
  id: number,
  depth: number,
  parentId: string | null,
  name: string,
}

export interface customIssue {
  gType: generalIssueTypes,
  sType: undetectedIssueTypes | specificIssueTypes,
  description: Array<string>, // 放key名的数组
  representation: any, // 暂时不放可视化
  location: Array<number>,
}

export const mapToComponent: { [key in specificIssueTypes | undetectedIssueTypes] : string} = {
  [specificIssueTypes.allDuplicate]: 'all-dup-form',
  [specificIssueTypes.dataAssociations]: 'data-association-form',
  [specificIssueTypes.distributionOutlier]: '',
  [specificIssueTypes.dupInArray]: 'dup-in-array',
  [specificIssueTypes.emptyValue]: 'empty-form',
  [specificIssueTypes.fieldWithSameValue]: '',
  [specificIssueTypes.hierKey]: 'hier-key-form',
  [specificIssueTypes.inconsistentStructure]: 'inconsistent-structure-form',
  [specificIssueTypes.inconsitentKey]: 'inconsistent-key-form',
  [specificIssueTypes.inconsitentType]: 'inconsistent-type-form',
  [specificIssueTypes.incorrectDataType]: 'incorrect-type-form',
  [specificIssueTypes.missingKey]: 'missing-key-form',
  [specificIssueTypes.missingValue]: 'empty-form', // 和emptyValue共用表单，本质上还是一样的转换操作
  [specificIssueTypes.partialDuplicate]: '',
  [specificIssueTypes.redundantExterior]: 'redundant-exterior-form',
  [specificIssueTypes.redundantInterior]: 'redundant-interior-form',
  [specificIssueTypes.redundantPadding]: 'redundant-padding-form',
  [undetectedIssueTypes.ambiguous]: 'not-support',
  [undetectedIssueTypes.correlated]: '',
  [undetectedIssueTypes.disaggrement]: 'not-support',
  [undetectedIssueTypes.dupKey]: '',
  [undetectedIssueTypes.format]: 'not-support',
  [undetectedIssueTypes.inconsistentPad]: '',
  [undetectedIssueTypes.inconsistentValue]: 'inconsistent-value-form',
  [undetectedIssueTypes.mislocate]: 'not-support',
  [undetectedIssueTypes.redundantKey]: 'redundant-key-form',
  [undetectedIssueTypes.semanticOutlier]: '',
};
