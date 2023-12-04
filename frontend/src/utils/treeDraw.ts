/* eslint-disable func-names */
/* eslint-disable no-param-reassign */
import * as d3 from 'd3';
import * as d3flextree from 'd3-flextree';
import { chartForType } from '@/utils/basicChart';
import {
  typeNodeStyle,
  edgeIconStyle,
  nodeTextStyle,
  attributeViewStyle,
  legendStyle,
  bubbleOpacity,
  bubbleFill,
} from '@/utils/style';
import {
  TypeNode,
  RectDef,
  treeDrawingData,
  edgeType,
  KV,
  edgeTypeMapName,
  nodeBubbleDesc,
  typeShortMapFull,
  selectedNodeInfo,
} from '@/utils/types';
import {
  fittingString,
  AincludeB,
  customRectCorner,
} from '@/utils/util';

function typeFeatureMapIcon(feature: string): string {
  switch (feature) {
    case edgeType.KeyOptional: return 'question';
    case edgeType.TypeAggr: return 'asterisk';
    case edgeType.ValueMultipleType: return 'orsign';
    case edgeType.MultiPiles: return 'plus';
    default: return '';
  }
}

function nodeIconMapPath(icon: string): string {
  switch (icon) {
    case typeShortMapFull.a: return 'array';
    case typeShortMapFull.d: return 'dict';
    case typeShortMapFull.e: return 'null';
    case typeShortMapFull.b: return 'bool';
    case typeShortMapFull.s: return 'string';
    case typeShortMapFull.n: return 'number';
    default: return '';
  }
}

// assign id to each node in the tree
export function dataProcessWithId(originalData: TypeNode): Array<TypeNode> {
  // need further update
  function customAccessChildren({ children }: { children: any, type: any }) {
    return children.length === 0 ? null : children;
  }
  return d3.hierarchy(originalData, customAccessChildren)
    .descendants()
    .map((d, i) => Object.assign(d, { id: i }))
    .map((d) => Object.assign(d.data, {
      id: d.id,
      parentId: d.parent && d.parent.id,
    }));
}

export function nodeDrawData(dataWithId: Array<TypeNode>, showAttr = true) {
  // assign max proportion to each level of children
  dataWithId.forEach((data: TypeNode) => {
    if (data.parentId == null) { // 根节点直接赋值
      Object.assign(data, { currentLevelMaxFreq: 1 });
    }

    let maxSubView = 0;
    data.children.forEach((cd: TypeNode | null) => {
      if (cd == null) return;
      maxSubView = Math.max(
        cd.type.reduce((a, b) => a + ((b !== 'e') ? 1 : 0), 0),
        maxSubView,
      );
    });

    data.children.forEach((cd: TypeNode | null) => {
      if (cd == null) return;
      Object.assign(cd, {
        currentLevelMaxView: maxSubView,
      });
    });
  });
  return dataWithId.map((data: TypeNode) => {
    // 映射nsbead
    const dataType = data.type.map((t) => (typeShortMapFull[t]));
    const { nodeFillColor } = typeNodeStyle;

    const heightEven = typeNodeStyle.nodeHeight / dataType.length;
    const sz = data.typeProp.length;

    let prevStart = 0;
    const childMapStartShift = new Map();
    const nodeMultipleRectInfo = dataType.map((t: string, i: number) => {
      const rightIcon = nodeIconMapPath(t);
      const rectHeight = heightEven;
      const currentStart = prevStart;
      prevStart += rectHeight;
      let rounded;
      if (i === 0 && i === sz - 1) rounded = 'all';
      else if (i === 0 && i !== sz - 1) rounded = 'top';
      else if (i !== 0 && i === sz - 1) rounded = 'bottom';
      else rounded = 'no';

      let shiftFromStartCenter = (currentStart + rectHeight / 2) - typeNodeStyle.nodeHeight / 2;
      if (Math.abs(shiftFromStartCenter) < 3) {
        shiftFromStartCenter = 0;
      }
      // 当前rect的中心减去原本的中心 就是当前rect的位移，用于后续link计算偏移
      childMapStartShift.set(i, shiftFromStartCenter);

      return {
        rectColor: nodeFillColor,
        rectHeight,
        rectWidth: typeNodeStyle.nodeWidth,
        starty: currentStart,
        startx: 0,
        radius: typeNodeStyle.nodeBorderRadius,
        rounded,
        rightIcon,
      };
    });

    // 记录当前节点整体的高度，用于from - to link的终点
    const currentNodeAllHeight = prevStart;
    let shiftFromEndCenter = (currentNodeAllHeight - typeNodeStyle.nodeHeight) / 2;
    // 如果画curve的话这部分的处理逻辑无需加上
    if (Math.abs(shiftFromEndCenter) < 3) {
      shiftFromEndCenter = 0;
    }

    const views = data.currentLevelMaxView;
    // flextree需要为每一个节点设定nodeSize
    const verticalSpacing = showAttr
      ? typeNodeStyle.nodeVerticalSpacingWithAttr : typeNodeStyle.nodeVerticalSpacingNoAttr;
    const horizontalSpacing = showAttr
      ? (typeNodeStyle.nodeHorizontalSpacingWithAttr
        + (views > 2 ? (views - 2) : 0) * attributeViewStyle.width)
      : typeNodeStyle.nodeHoriontalSpacingNoAttr;
    let size = [horizontalSpacing + typeNodeStyle.nodeWidth, verticalSpacing];
    size = size.slice()
      .reverse();

    // 拿出所有存在的edge feature
    const fs = data.feature;
    const dataTypeFeature: Array<string> = [];

    let piled = false;
    let nodeKey = '';
    if (data.key) {
      const splittvs = data.key.split('#;');
      [nodeKey] = splittvs;
      piled = splittvs.length > 1;
    }

    if (piled) {
      dataTypeFeature.push(edgeType.MultiPiles);
    }

    if (dataType.length > 1) {
      dataTypeFeature.push(edgeType.ValueMultipleType);
    }
    const fmap = {
      isMultiple: edgeType.TypeAggr,
      isOption: edgeType.KeyOptional,
    };
    (Object.keys(fs) as Array<keyof typeof fs>)
      .forEach((f) => {
        if (fs[f]) dataTypeFeature.push(fmap[f]);
      });

    let attrs: Array<{dataType: string, data: any}> = [];
    if (showAttr) {
      attrs = dataType
        .map((t: string, i: number) => {
          const sourceData = data.data[i];
          return {
            dataType: t,
            data: [...sourceData],
          };
        });
    }

    return {
      nodeId: data.id,
      parentNodeId: data.parentId,
      parentIndex: data.parentIndex,
      nodeWidth: typeNodeStyle.nodeWidth,
      nodeHeight: typeNodeStyle.nodeHeight,
      nodeBorderRadius: typeNodeStyle.nodeBorderRadius,
      nodeMultipleRectInfo,
      shiftFromEndCenter: !data.key ? 0 : shiftFromEndCenter,
      shiftFromStartCenter: childMapStartShift,
      connectorLineColor: typeNodeStyle.connectorLineColor,
      connectorLineWidth: typeNodeStyle.connectorLineWidth,
      dataType,
      nodeFillColor,
      dataTypeFeature,
      dataTypeText: data.key,
      dataTypeTextTruncated: data.key
        && fittingString(nodeKey, typeNodeStyle.nodeWidth
          - typeNodeStyle.iconsize - typeNodeStyle.iconPadding * 2, nodeTextStyle.fontSize),
      attrs,
      size,
      showAttr,
    };
  });
}

export class TreeChart {
  svgWidth: number;

  svgHeight: number;

  margins: Array<number>;

  container: string;

  data: any; // 画schema Tree的数据

  bubbleData: Array<nodeBubbleDesc> | any; // 画bubble set的数据

  zoomLevel: number;

  depth: number;

  calculated: KV; // SVG画布相关的信息，如宽高、边距、对称中心

  layouts: any; // 用于存放layout配置

  realChart: any;

  previousTransform: any;

  centerG: any;

  maskBubble: any;

  centerX: number;

  root: any; // 树的根节点及其children

  allNodes: any; // 用于存放root数据输入layout配置中后生成的位置信息

  defaultFont: string;

  duration: number;

  cliqueData: any;

  store: any;

  zoomfunc: any;

  constructor(
    _margins: Array<number>,
    _container: string,
    _data: any,
    _store: any,
    _cliqueData: any,
    _zoomLevel = 1.0,
  ) {
    this.svgWidth = 500;
    this.svgHeight = 500;
    this.margins = _margins;
    this.container = _container;
    this.zoomLevel = _zoomLevel;
    this.depth = 10;
    this.calculated = {};
    this.layouts = null;
    this.realChart = null;
    this.previousTransform = null;
    this.centerX = 0;
    this.root = null;
    this.defaultFont = 'Helevtica';
    this.duration = 600;
    this.data = _data;
    this.cliqueData = _cliqueData;
    this.store = _store;
    this.zoomfunc = null;

    this.zoomed.bind(this);
    this.setZoomFactor.bind(this);
    this.batchEnterExitUpdate();
  }

  public triggerZoom({
    targetx,
    targety,
    width,
    height,
  }: any) {
    const shiftx = this.calculated.centerX - targetx - width / 2
    + this.calculated.chartHorizontalMargin;
    const shifty = -targety - height / 2
    + this.calculated.chartVerticalMargin;

    const transform = d3.zoomIdentity
      .scale(1)
      .translate(shiftx, shifty);

    // 一定要作用在当初call zoom的元素上！！否则会一段一段的不连续，zoom transform也记录上一次位移的结果
    d3.select('svg.svg-chart-container')
      .transition()
      .duration(600)
      .call(
        this.zoomfunc.transform,
        transform,
      );
  }

  // 需要再展开收起节点后自适应当前容器
  public setZoomFactor() {
    const currentWidth = this.centerG.node()
      .getBoundingClientRect().width;
    let targetZoomLevel = this.svgWidth / currentWidth;
    targetZoomLevel = targetZoomLevel > 1 ? 1 : targetZoomLevel;
    this.zoomLevel = targetZoomLevel;

    this.centerG.attr('transform', `translate(${this.calculated.nodeMaxWidth / 2}, ${this.calculated.centerY}) scale(${targetZoomLevel})`);
  }

  private zoomed(e: any) {
    this.previousTransform = e.transform;
    this.realChart.attr('transform', e.transform.toString());
  }

  private handleCircleClick(_: any, d: treeDrawingData) {
    if (d.children) {
      d.hiddenChildren = d.children;
      d.children = null;
    } else {
      if (d.hiddenChildren) d.children = d.hiddenChildren;
      d.hiddenChildren = null;
    }

    this.update(d);
  }

  private handleRectClick(
    _: any,
    parent: treeDrawingData,
    childrenToToggle: Array<treeDrawingData>,
  ) {
    // childrenToToggle 全部出现在children中，说明当前点击是期望收起
    if (parent.children && AincludeB(parent.children, childrenToToggle)) {
      if (!parent.hiddenChildren) {
        parent.hiddenChildren = [];
      }
      parent.hiddenChildren = parent.hiddenChildren.concat(childrenToToggle);
      parent.children = parent.children.filter((cd) => !childrenToToggle.includes(cd));
      // 如果传入空数组，d3 tree.js会报错 read properties of undefined (reading 'z') at firstWalk
      // 没有children只能传null
      if (!parent.children.length) {
        parent.children = null;
      }
    } else if (parent.hiddenChildren && AincludeB(parent.hiddenChildren, childrenToToggle)) {
      if (!parent.children) {
        parent.children = [];
      }
      parent.children = parent.children.concat(childrenToToggle);
      parent.hiddenChildren = parent.hiddenChildren.filter((cd) => !childrenToToggle.includes(cd));
      if (!parent.hiddenChildren.length) parent.hiddenChildren = null;
    }

    this.update(parent);
  }

  private declareIssueMenu(event: any) {
    event.preventDefault();
    if (!this.store.state.selectedNode.length) {
      event.stopPropagation();
      return; // 什么都没有选中不显示菜单
    }
    this.store.commit('setContextMenuVisibility', true);
  }

  private handleNodeMultipleSelect(event: any, d: treeDrawingData) {
    if (!event.shiftKey) {
      return;
    }
    const curId = parseInt(d.id, 10);
    // 当前node已经选中
    if (this.store.state.selectedNode.find((node: selectedNodeInfo) => node.id === curId)) {
      d3.select(event.currentTarget)
        .select('.full-rect')
        .classed('selected', false);
      this.store.commit('removeSelectedNode', curId);
      return;
    }
    const nodeInfo: selectedNodeInfo = {
      id: curId,
      depth: d.depth,
      parentId: d.parent ? d.parent.id : null,
      name: d.data.dataTypeText || 'Unnamed Node',
    };
    // 触发多选
    this.store.commit('addSelectedNode', nodeInfo);
    d3.select(event.currentTarget)
      .select('.full-rect')
      .classed('selected', true);
  }

  private handleCliqueClick(event: any) {
    if (!event.target.classList.contains('clique')) return;
    // 如果在给join path clique的过程中class顺序变了，这边也要相应变动
    const clickId = event.target.classList[1].slice(1); // 以c开头，因为classname不允许数字开头
    this.store.commit('updateSelectedIssue', clickId);
  }

  // eslint-disable-next-line class-methods-use-this
  private batchEnterExitUpdate() {
    d3.selection.prototype.patternify = function (selectedTag:
    { tag: string, selector: string, targetData?: any }) {
      const { tag, selector } = selectedTag;
      const tmpData = selectedTag.targetData || [selector];
      const batchSelection = this.selectAll(`.${selector}`)
        .data(tmpData, (d: any, i: any) => {
          if (typeof d === 'object') {
            if (d.id) {
              return d.id;
            }
          }
          return i;
        });

      batchSelection.exit()
        .remove();
      const mergedSelection = batchSelection.enter()
        .append(tag)
        .merge(batchSelection);
      mergedSelection.attr('class', selector);
      return mergedSelection;
    };
  }

  public render() {
    // 获取当前svg所在容器，使svg长度高度匹配容器
    const drawingContainer = d3.select(this.container);
    // 清空当前容器下的所有子元素
    (drawingContainer.node() as HTMLElement).replaceChildren();

    const drawingContainerBoundry = (drawingContainer.node() as HTMLElement)
      .getBoundingClientRect();
    if (drawingContainerBoundry.width > 0) {
      this.svgWidth = drawingContainerBoundry.width;
      this.svgHeight = drawingContainerBoundry.height;
    }

    const nodeMaxWidth = d3.max(this.data, (({ nodeWidth }) => nodeWidth));
    const nodeMaxHeight = d3.max(this.data, (({ nodeHeight }) => nodeHeight));
    this.calculated = {
      id: `ID${Math.floor(Math.random() * 1000000)}`,
      chartVerticalMargin: this.margins[0],
      chartHorizontalMargin: this.margins[1],
      chartWidth: this.svgWidth - this.margins[0] * 2,
      chartHeight: this.svgHeight - this.margins[1] * 2,
      nodeMaxWidth,
      nodeMaxHeight,
      centerX: (this.svgWidth - this.margins[0] * 2) / 2,
      centerY: (this.svgHeight - this.margins[1] * 2) / 2,
    };

    this.depth = nodeMaxWidth / 2;
    this.layouts = {
      treemap: null,
    };
    this.layouts.treemap = d3flextree.flextree();

    this.root = d3.stratify()
      .id((d: any) => d.nodeId)
      .parentId((d: any) => d.parentNodeId)(this.data);

    this.root.x0 = 0;
    this.root.y0 = 0;

    // pan & zoom handler
    this.zoomfunc = (d3.zoom() as any).on('zoom', this.zoomed.bind(this));

    // svg画布
    const svg = drawingContainer.patternify({ tag: 'svg', selector: 'svg-chart-container' })
      .attr('width', this.svgWidth)
      .attr('height', this.svgHeight)
      .attr('font-family', this.defaultFont)
      .call(this.zoomfunc)
      .on('dblclick.zoom', null)
      .attr('cursor', 'move');

    // 画legend
    const typeLegend = svg.patternify({ tag: 'g', selector: 'legend-type' });

    const typeLegendInfo = Object.values(typeShortMapFull)
      .map((v: string) => ([v === typeShortMapFull.d ? 'Dict' : v, nodeIconMapPath(v)]));

    const typeLegendGroup = typeLegend.selectAll<SVGGElement, Array<number>>('g.legendRow')
      .data(typeLegendInfo);

    const typeLegendEnter = typeLegendGroup.enter()
      .append('g')
      .attr('class', 'legendRow')
      .attr('transform', (_: any, i: number) => `translate(${legendStyle.rowWidthType}, ${(Math.max(legendStyle.iconsize, legendStyle.fontsize) + legendStyle.rowPadding) * i + 20})`)
      .attr('cursor', 'all');

    typeLegendEnter.patternify({ tag: 'image', selector: 'legend-shape' });
    typeLegendEnter.patternify({ tag: 'text', selector: 'legend-text' });

    const typeLegendUpdate = typeLegendEnter.merge(typeLegendGroup);

    typeLegendUpdate.select('.legend-shape')
      .attr('transform', 'translate(0, -2)')
      .attr('xlink:xlink:href', (d: any) => {
        // eslint-disable-next-line
        const iconPath = require(`@/assets/icons/${d[1]}.svg`);
        return iconPath;
      })
      .attr('width', legendStyle.iconwidthT)
      .attr('height', legendStyle.iconheightT);

    typeLegendUpdate.select('.legend-text')
      .attr('x', legendStyle.iconsize + legendStyle.padding * 2)
      .attr('y', 0)
      .attr('font-size', legendStyle.fontsize)
      .attr('text-anchor', 'start')
      .attr('alignment-baseline', 'hanging')
      .text((d: any) => d[0]);

    const iconLegend = svg.patternify({ tag: 'g', selector: 'legend-icon' });

    const iconLegendInfo = (Object.keys(edgeType) as Array<keyof typeof edgeType>)
      .map((key) => ([edgeTypeMapName[key],
        typeFeatureMapIcon(edgeType[key])]));
    const iconLegendGroup = iconLegend.selectAll<SVGGElement, Array<any>>('g.legendRow')
      .data(iconLegendInfo);

    const iconLegendEnter = iconLegendGroup.enter()
      .append('g')
      .attr('transform', (_: any, i: number) => `translate(${legendStyle.rowWidthType + legendStyle.rowWidthIcon}, ${(Math.max(legendStyle.iconsize, legendStyle.fontsize) + legendStyle.rowPadding) * i + 20})`)
      .attr('cursor', 'all');

    iconLegendEnter.patternify({ tag: 'image', selector: 'legend-shape' });
    iconLegendEnter.patternify({ tag: 'text', selector: 'legend-text' });

    const iconLegendUpdate = iconLegendEnter.merge(iconLegendGroup);

    iconLegendUpdate.select('.legend-shape')
      .attr('xlink:xlink:href', (d: any) => {
        // eslint-disable-next-line
        const iconPath = require(`@/assets/icons/${d[1]}.svg`);
        return iconPath;
      })
      .attr('width', legendStyle.iconsize)
      .attr('height', legendStyle.iconsize);
    iconLegendUpdate.select('.legend-text')
      .attr('x', legendStyle.iconsize + legendStyle.padding)
      .attr('y', 1)
      .attr('font-size', legendStyle.fontsize)
      .attr('text-anchor', 'start')
      .attr('alignment-baseline', 'hanging')
      .text((d: any) => d[0]);

    // svg画布与容器边距
    const chart = svg.patternify({ tag: 'g', selector: 'chart' })
      .attr('transform', `translate(${this.calculated.chartHorizontalMargin}, ${this.calculated.chartVerticalMargin})`);
    this.realChart = chart;

    const maskBubble = chart.patternify({ tag: 'g', selector: 'group-mask' })
      .attr('transform', `translate(${nodeMaxWidth / 2}, ${this.calculated.centerY}) scale(${this.zoomLevel})`)
      .on('click', this.handleCliqueClick.bind(this));
    this.maskBubble = maskBubble;

    // 真正放置node link
    const centerG = chart.patternify({ tag: 'g', selector: 'center-group' })
      .attr('transform', `translate(${nodeMaxWidth / 2}, ${this.calculated.centerY}) scale(${this.zoomLevel})`);
    this.centerG = centerG;

    // 开始画图例

    // 开始画node link
    this.update(this.root);

    return this;
  }

  private update(data: treeDrawingData) {
    const treeData = this.layouts.treemap(this.root);
    const linksData = treeData.descendants()
      .slice(1);
    const nodesData = treeData.descendants();
    nodesData.forEach((d: treeDrawingData) => {
      const originalX = d.x;
      d.x = d.y;
      d.y = originalX;
    });
    this.store.commit('setVisibileNode', nodesData);
    // 如果是水平视图，要等nodesData转变过后再解构，否则得到的是转变之前的位置，造成transition bug
    const {
      x0, y0, x, y,
    } = data;

    // ************************************绘制link************************************
    const linksSelection = this.centerG.selectAll('path.link')
      .data(linksData, (d: treeDrawingData) => d.id);

    const linkGen = d3.linkHorizontal();

    const linksEnter = linksSelection.enter()
      .insert('path', 'g')
      .attr('class', 'link')
      .attr('d', () => {
        const o: d3.DefaultLinkObject = {
          source: [x0, y0],
          target: [x0, y0],
        };
        return linkGen(o);
      });

    const linkUpdate = linksEnter.merge(linksSelection);

    linkUpdate.attr('fill', 'none')
      .attr('stroke-width', ((d: treeDrawingData) => d.data.connectorLineWidth || 2))
      .attr('stroke', (d: treeDrawingData) => (d.data.connectorLineColor ? d.data.connectorLineColor : 'black'));

    linkUpdate.transition()
      .duration(this.duration)
      .attr('d', (d: treeDrawingData) => {
        // linksData.forEach((d: treeDrawingData) => {
        //   d.y += d.data.shiftFromEndCenter;
        // });
        // 不直接修改linksData所指的位置，因为这个位置后续还会被Node使用
        // 从儿子向父亲的link，需要在儿子节点的y轴考虑中间位置的shift，
        // 需要在父亲节点的y轴（valueMultipleType）考虑当前父亲的shift
        // 需要优化一下此处代码，尝试将shift信息放到d的下一层，而非data中

        const xshiftStart = -typeNodeStyle.nodeWidth / 2;
        const yshiftStart = d.data.shiftFromEndCenter;
        const xshiftEnd = typeNodeStyle.nodeWidth / 2;
        const yshiftEnd = (d.parent.data.shiftFromStartCenter.get(d.data.parentIndex) || 0);

        const o: d3.DefaultLinkObject = {
          source: [d.x + xshiftStart, d.y + yshiftStart],
          target: [d.parent.x + xshiftEnd,
            d.parent.y + yshiftEnd],
        };
        return linkGen(o);
      });

    // 用于节点收缩或展开是动效终点所处位置
    linksSelection.exit()
      .transition()
      .duration(this.duration)
      .attr('d', () => {
        const o: d3.DefaultLinkObject = {
          source: [x, y],
          target: [x, y],
        };
        return linkGen(o);
      })
      .remove();

    // ************************************绘制node************************************
    const nodesSelection = this.centerG.selectAll('g.node')
      .data(nodesData, (d: treeDrawingData) => d.id);

    const nodeEnter = nodesSelection.enter()
      .append('g')
      .attr('class', (d: treeDrawingData) => `node nodeg-${d.id}`)
      .attr('transform', () => `translate(${x0}, ${y0})`)
      .attr('cursor', 'pointer');

    // ************************************节点、节点文本、节点上方边文本****************************
    const nodeGroups = nodeEnter.patternify({ tag: 'g', selector: 'node-group', targetData: (d: any) => [d] });
    const edgeIconGroups = nodeEnter.patternify({ tag: 'g', selector: 'edge-icon-g', targetData: (d: any) => [d] });
    // 使用image加载svg文件不能直接控制color 后序有需要再改
    const attrGroups = nodeEnter.patternify({ tag: 'g', selector: 'attr-group', targetData: (d: any) => [d] });
    const nodeUpdate = nodeEnter.merge(nodesSelection);

    nodeUpdate.transition()
      .attr('opaicty', 0)
      .duration(this.duration)
      .attr('transform', (d: treeDrawingData) => `translate(${d.x}, ${d.y})`)
      .attr('opacity', 1)
      .end()
      .then(() => {
        if (!this.store.state.treeInitialRender) return;
        const bubbleData = this.store.getters.generateBubbleData;
        d3.select('.group-mask')
          .selectAll('path.clique')
          .data(bubbleData, (d: any) => `${d.issueId}${d.pathd}`)
          // 用pathd作为enter exit判断基准，因为当前节点展开收起有可能影响同一层的其他节点，用issueId+关联node无法实现
          .join(
            (enter: any) => enter.append('path')
              // 这三个class的顺序不能变，clique是通用选择
              // c${d.issueId}用于对应issueList中每个选项的联动
              .attr('class', (d: any) => `clique c${d.issueId}`)
              .attr('d', (d: any) => d.pathd)
              .classed('clique-border', (d: any) => (d.issueId === this.store.state.selectedIssue))
              .attr('fill-opacity', 0)
              .transition()
              .duration(500)
              .attr('fill', (d: any) => bubbleFill[d.cliqueIssueType as keyof typeof bubbleFill])
              .attr('fill-opacity', bubbleOpacity)
              .attr('cursor', 'pointer'),
            (update: any) => update,
            (exit: any) => exit.transition()
              .duration(500)
              .attr('opacity', 0)
              .remove(),
          );
        this.store.commit('setTreeInitialRender', false);
      });

    // 绑定选中节点的交互
    nodeGroups
      .on('click', this.handleNodeMultipleSelect.bind(this))
      .on('contextmenu', this.declareIssueMenu.bind(this));

    nodeGroups.attr('transform', ({ data: info }: treeDrawingData) => `translate(${-info.nodeWidth / 2}, ${-info.nodeHeight / 2})`);
    attrGroups.attr('transform', ({ data: info }: treeDrawingData) => `translate(${-info.nodeWidth / 2}, ${-info.nodeHeight / 2})`);

    nodeGroups.each(function (this: any, dataBindToThis: any) {
      const current = d3.select(this);
      if (!dataBindToThis.data.dataTypeText) {
        current.patternify({ tag: 'rect', selector: `full-rect-${dataBindToThis.id}` });
        nodeGroups.select(`.full-rect-${dataBindToThis.id}`)
          .attr('class', `full-rect-${dataBindToThis.id} type-node full-rect`)
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', typeNodeStyle.nodeWidth)
          .attr('height', typeNodeStyle.nodeHeight)
          .attr('fill', ({ data: info }: treeDrawingData) => info.nodeFillColor)
          .attr('rx', typeNodeStyle.nodeBorderRadius)
          .attr('stroke-width', typeNodeStyle.rectBorder)
          .attr('stroke', typeNodeStyle.rectBorderColor)
          .attr('stroke-opacity', typeNodeStyle.strokeOpacity)
          .attr('cursor', (d: treeDrawingData) => (!d.children && !d.hiddenChildren ? 'none' : 'pointer'))
          .attr('pointer-events', (d: treeDrawingData) => (!d.children && !d.hiddenChildren ? 'none' : 'all'));
        current.patternify({ tag: 'image', selector: `rect-icon-${dataBindToThis.id}` });
        nodeGroups.select(`.rect-icon-${dataBindToThis.id}`)
          .attr('transform', ({ data: info }: treeDrawingData) => `translate(${info.nodeWidth / 2 - typeNodeStyle.iconsize / 2}, ${(info.nodeHeight - typeNodeStyle.iconsize) / 2 - 1})`)
          .attr('xlink:xlink:href', ({ data: info }: treeDrawingData) => {
            // 直接取只有一个
            const t = nodeIconMapPath(info.dataType[0]);
            // eslint-disable-next-line
            const iconPath = require(`@/assets/icons/${t}.svg`);
            return iconPath;
          })
          .attr('width', typeNodeStyle.iconsizecenter)
          .attr('height', typeNodeStyle.iconsizecenter);
      } else {
        // 用于绘制边框
        current.patternify({ tag: 'rect', selector: `full-rect-${dataBindToThis.id}` });
        nodeGroups.select(`.full-rect-${dataBindToThis.id}`)
          .attr('class', `full-rect-${dataBindToThis.id} full-rect`)
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', typeNodeStyle.nodeWidth)
          .attr('height', typeNodeStyle.nodeHeight)
          .attr('fill', ({ data: info }: treeDrawingData) => info.nodeFillColor)
          .attr('rx', typeNodeStyle.nodeBorderRadius)
          .attr('stroke-width', typeNodeStyle.rectBorder * 2)
          .attr('stroke', typeNodeStyle.rectBorderColor)
          .attr('stroke-opacity', typeNodeStyle.strokeOpacity)
          .attr('cursor', 'pointer');
        dataBindToThis.data.nodeMultipleRectInfo.forEach((nodeRectData: RectDef, i: number) => {
          // 用于绑定当前type的展开收缩交互
          current.patternify({ tag: 'path', selector: `multi-type-rect-${dataBindToThis.id}-${i}` });
          nodeGroups.select(`.multi-type-rect-${dataBindToThis.id}-${i}`)
            .attr('class', `multi-type-rect-${dataBindToThis.id}-${i} type-node`)
            .attr('d', customRectCorner(nodeRectData))
            .attr('fill', nodeRectData.rectColor)
            .attr('cursor', (d: treeDrawingData) => (!d.children && !d.hiddenChildren ? 'none' : 'pointer'))
            .attr('pointer-events', (d: treeDrawingData) => (!d.children && !d.hiddenChildren ? 'none' : 'all'));

          // 当前type的icon
          const iconsz = Math.min(nodeRectData.rectHeight, typeNodeStyle.iconsize);
          const flag = nodeRectData.rectHeight < typeNodeStyle.iconsize;
          const yshift = (nodeRectData.rectHeight - (nodeRectData.starty + iconsz)) / 2;
          current.patternify({ tag: 'image', selector: `multi-type-icon-${dataBindToThis.id}-${i}` });
          nodeGroups.select(`.multi-type-icon-${dataBindToThis.id}-${i}`)
            .attr('transform', `translate(${typeNodeStyle.nodeWidth - iconsz - typeNodeStyle.iconPadding}, ${nodeRectData.starty + (flag ? 0 : yshift)})`)
            .attr('xlink:xlink:href', () => {
              // eslint-disable-next-line
              const iconPath = require(`@/assets/icons/${nodeRectData.rightIcon}.svg`);
              return iconPath;
            })
            .attr('width', iconsz)
            .attr('height', iconsz)
            .on('click', () => {
              d3.select(`.multi-type-rect-${dataBindToThis.id}-${i}`)
                ?.dispatch('click');
            }); // 支持点击icon触发节点展开收缩
        });
      }
    });

    attrGroups.each(function (this: any, dataBindToThis: any) {
      const current = d3.select(this);
      if (!dataBindToThis.data.attrs || !dataBindToThis.data.showAttr) return;
      let cnt = 0; // 计数，如果前面是null的话就没有图，index失效
      dataBindToThis.data.attrs.forEach(
        (attrView: {dataType: typeShortMapFull, data: any}, i: number) => {
          // if (attrView.dataType === typeShortMapFull.e) return; // Null 不用画图
          const container = current.patternify({ tag: 'g', selector: `node-attrview-${dataBindToThis.id}-${i}` });
          const divS = container
            .append('foreignObject')
            .attr('width', attributeViewStyle.width + 2)
            .attr('height', attributeViewStyle.height + 2)
            .attr('transform', `translate(${6 + attributeViewStyle.width * cnt}, ${-attributeViewStyle.height - 2})`)
            .append('xhtml:div')
            .attr('class', `node-attrview-${dataBindToThis.id}-${i} attrview`)
            .attr('data-identifier', `${dataBindToThis.id}-${i}`)
            .style('box-sizing', 'border-box')
            .style('overflow', 'hidden')
            .style('width', `${attributeViewStyle.width}px`)
            .style('height', `${attributeViewStyle.height}px`);
          const node = divS.node() as HTMLElement;
          chartForType[attrView.dataType as keyof typeof chartForType](
            node,
            attrView,
            `.node-attrview-${dataBindToThis.id}-${i}`,
          );
          cnt += 1;
        },
      );
    });

    // 为所有circle和rect绑定展开收起交互事件
    d3.selectAll('.type-node')
      .on('click', (event: any, d: any) => {
        if (event.shiftKey) return; // shift多选直接返回
        // 当前点击的是circle 只能是全部隐藏或者全部展开
        if (!d.data.dataTypeText) {
          this.handleCircleClick(event, d);
          return;
        }

        // 当前点击的是rect
        // 依据event.srcElement.classList中以node-multi-rect开头的类的parentType
        const filteredClass = [...event.srcElement.classList].filter((c: string) => c.startsWith('multi-type-rect'));
        if (!filteredClass.length) return;
        const lastdash = filteredClass[0].lastIndexOf('-');
        const classfull = filteredClass[0];
        const idx = Number.parseInt(
          classfull.substr(lastdash + 1, classfull.length - lastdash - 1),
          10,
        );
        let childrenToToggle;
        // 如果当前的整个大节点有一部分收起、一部分展开
        if (d.children && d.hiddenChildren) {
          // 尝试在展开的节点中查找当前所属的子节点
          childrenToToggle = d.children.filter(
            (cd: any) => (cd.data.parentIndex === idx),
          );
          // 找不到的话，继续去收起的部分找
          if (childrenToToggle.length === 0) {
            childrenToToggle = d.hiddenChildren.filter(
              (cd: any) => (cd.data.parentIndex === idx),
            );
          }
        } else if (d.children) { // 当前整个的大节点全部展开
          childrenToToggle = d.children.filter(
            (cd: any) => (cd.data.parentIndex === idx),
          );
        } else if (d.hiddenChildren) { // 当前整个的大节点全部收起
          childrenToToggle = d.hiddenChildren.filter(
            (cd: any) => (cd.data.parentIndex === idx),
          );
        }
        this.handleRectClick(event, d, childrenToToggle);
      });

    d3.selectAll('.attrview')
      .on('click', (event: any) => {
        if (Array.from(event.target.classList)
          .includes('attrview-wrapper-icon')) {
          return; // 点击flip icon不触发新的decoration
        }
        const { identifier } = event.currentTarget.dataset;
        this.store.dispatch('getDecoration', identifier.split('-'));
      });

    const nodeRectText = nodeGroups.patternify({ tag: 'g', selector: 'node-text', targetData: (d: any) => [d] });
    nodeRectText.patternify({ tag: 'svg:title', selector: 'node-tooltip' });
    nodeRectText.patternify({ tag: 'text', selector: 'node-text' });
    nodeRectText.select('.node-text')
      .attr('class', ({ data: info }: treeDrawingData) => (info.dataTypeText !== info.dataTypeTextTruncated ? 'node-text text-hover' : 'node-text'))
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('fill', nodeTextStyle.color)
      .attr('font-size', nodeTextStyle.fontSize)
      .attr('y', ({ data: info }: treeDrawingData) => typeNodeStyle.nodeHeight / 2 + nodeTextStyle.yAxisAdjust + info.shiftFromEndCenter)
      .attr('x', -4 + typeNodeStyle.nodeWidth / 2)
      .text(({ data: info }: treeDrawingData) => info.dataTypeTextTruncated)
      .attr('cursor', ({ data: info }: treeDrawingData) => (info.dataTypeText !== info.dataTypeTextTruncated ? 'pointer' : 'move'));
    // 点击node-text无法触发展开收起节点，因为文本居中，无法区分文本点击处是哪个方形区域（有多个type）

    nodeRectText.select('.node-tooltip')
      .filter(({ data: info }: treeDrawingData) => info.dataTypeText !== info.dataTypeTextTruncated)
      .text(({ data: info }: treeDrawingData) => {
        if (!info.dataTypeText) return '';
        const dictArr = info.dataTypeText.split('#;');
        return dictArr.reduce((a, b) => `${a}\n${b}`, '');
      });

    // edge icon group位移，可能存在多个edge icon
    edgeIconGroups
      .attr('transform', ({ data: info }: treeDrawingData) => {
        const tx = -info.nodeWidth / 2 - edgeIconStyle.width;
        const ty = info.shiftFromEndCenter - edgeIconStyle.height;
        return `translate(${tx}, ${ty})`;
      });
    edgeIconGroups.each(function (this: any, dataBindToThis: any) {
      const current = d3.select(this);
      const nodeEdgeFeature = dataBindToThis.data.dataTypeFeature;

      if (nodeEdgeFeature.length === 0) return;

      nodeEdgeFeature.forEach((f: string, i: number) => {
        const icon = current.patternify({ tag: 'image', selector: `edge-icon-${i}` });
        icon
          .attr('transform', `translate(${-i * edgeIconStyle.width}, 0)`)
          .attr('xlink:xlink:href', () => {
            const icontype = typeFeatureMapIcon(f);
            // eslint-disable-next-line
            const iconPath = require(`@/assets/icons/${icontype}.svg`);
            return iconPath;
          })
          .attr('width', edgeIconStyle.width)
          .attr('height', edgeIconStyle.height);
      });
    });

    // ************************************exit 节点************************************
    nodesSelection.exit()
      .attr('opacity', 1)
      .transition()
      .duration(this.duration)
      .attr('transform', `translate(${x},${y})`)
      .on('end', function (this: any) {
        d3.select(this)
          .remove();
      })
      .attr('opacity', 0);

    // Store the old positions for transition.
    nodesData.forEach((d: treeDrawingData) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }
}
