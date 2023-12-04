export const typeNodeStyle = {
  nodeWidth: 100,
  nodeHeight: 30,
  nodeBorderRadius: 2,
  verticalLineLength: 40,
  verticalLineWidth: 5,
  nodeHorizontalSpacingWithAttr: 80,
  nodeHoriontalSpacingNoAttr: 60,
  nodeVerticalSpacingWithAttr: 150, // 调整垂直距离，有可能会影响bubble是否能够包住当前节点
  nodeVerticalSpacingNoAttr: 70,
  connectorLineColor: '#0000004D', // 树中link的颜色
  connectorLineWidth: 0.5,
  iconsize: 12, // 树中node右侧type icon的大小，只能控制单个icon存在的节点，多个icon节点是计算固定的
  iconPadding: 3,
  iconsizecenter: 16,
  nodeFillColor: '#fffffe', // 树中节点的填充背景色
  rectBorder: 1, // 树中node的边框粗细
  rectBorderColor: '#000000', // 树中node边框颜色
  strokeOpacity: 0.15,
};

export const nodeTextStyle = {
  color: '#434343', // 树中node内文本字体颜色
  fontSize: 16,
  yAxisAdjust: 2,
};

export const edgeIconStyle = {
  width: 12, // *?+的宽度 icon在assets的icons目录下
  height: 12, // *?+的高度
};

export const attributeViewStyle = {
  width: 70,
  height: 70,
  ml: 10,
  mt: 5,
  mr: 0,
  mb: 0,
};

export const legendStyle = {
  iconsize: 16,
  iconwidthT: 16,
  iconheightT: 16,
  fontsize: 16,
  padding: 3,
  rowWidthType: 10,
  rowWidthIcon: 91,
  rowPadding: 6,
};

// schema view 中bubble对应的颜色，需要加一个opacity，否则会很难看
export enum bubbleFill {
  Completeness = '#e78ac3',
  Consistency = '#fc8d62',
  Redundancy = '#8da0cb',
  Duplicate = '#66c2a5',
  Schema = '#a6d854',
  Accuracy = '#ffd92f',
}

export const bubbleOpacity = '0.2';

export const OverviewLegendFill = {
  Completeness: '#e78ac380',
  Consistency: '#fc8d6280',
  Redundancy: '#8da0cb80',
  Duplicate: '#66c2a580',
  Schema: '#a6d85480',
  Accuracy: '#ffd92f80',
};

// 凸包选中和节点选中的样式在App.vue的style标签下
