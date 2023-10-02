/* eslint-disable no-empty */
/* eslint-disable newline-per-chained-call */
import * as d3 from 'd3';
import * as d3box from 'd3-boxplot';
import * as ecStat from 'echarts-stat';
// 引入 echarts 核心模块，核心模块提供了 echarts 使用必须要的接口。
import * as echarts from 'echarts/core';
// 引入柱状图图表，图表后缀都为 Chart
import {
  BarChart,
  CustomChart,
  HeatmapChart,
  PieChart,
} from 'echarts/charts';
// 引入提示框，标题，直角坐标系，数据集，内置数据转换器组件，组件后缀都为 Component
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  VisualMapComponent,
} from 'echarts/components';
// 标签自动布局、全局过渡动画等特性
import { LabelLayout, UniversalTransition } from 'echarts/features';
// 引入 Canvas 渲染器，注意引入 CanvasRenderer 或者 SVGRenderer 是必须的一步
import { SVGRenderer } from 'echarts/renderers';

import { attributeViewStyle } from './style';
import { attrViewDesc, typeShortMapFull } from './types';
// 注册必须的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  BarChart,
  HeatmapChart,
  PieChart,
  LabelLayout,
  UniversalTransition,
  SVGRenderer,
  VisualMapComponent,
  CustomChart,
]);

const createSVGElement = () => {
  const xmlns = 'http://www.w3.org/2000/svg';
  const boxWidth = attributeViewStyle.width;
  const boxHeight = attributeViewStyle.height;

  const svgElem = document.createElementNS(xmlns, 'svg');
  svgElem.setAttributeNS(null, 'viewBox', `0 0 ${boxWidth} ${boxHeight}`);
  svgElem.setAttributeNS(null, 'width', `${boxWidth}`);
  svgElem.setAttributeNS(null, 'height', `${boxHeight}`);
  svgElem.style.display = 'block';
  return svgElem;
};

export const drawBox = (
  gClass: string,
  info: attrViewDesc,
  shiftx = 0,
  shifty = 0,
) => {
  const w = attributeViewStyle.width - attributeViewStyle.ml - attributeViewStyle.mr;
  const h = attributeViewStyle.height - attributeViewStyle.mt - attributeViewStyle.mb;
  const container = d3.select(gClass);

  const boxReal = container.append('g')
    .attr('transform', `translate(${shiftx + attributeViewStyle.ml - 1}, ${shifty + h / 2})`)
    .attr('color', '#4292c6');

  let countNan = 0;
  info.attrViewData.forEach((d) => {
    if (Number.isNaN(d)) countNan += 1;
  });

  const stats = d3box.boxplotStats(info.attrViewData);
  const x = d3.scaleLinear()
    .domain(d3.extent(info.attrViewData) as [number, number])
    .range([0, w]);

  const outliers: Array<number> = [];
  const bp = d3box.boxplot()
    .jitter(0)
    .showInnerDots(false)
    .scale(x)
    .boxwidth(h / 2)
    .opacity(0.9)
    .key((i: number) => outliers.push(i));

  boxReal.datum(stats)
    .call(bp);

  let text = `Max: ${d3.max(info.attrViewData)}`;
  text += `\nMean: ${(d3.mean(info.attrViewData) as number).toFixed(2)}`;
  text += `\nMin: ${d3.min(info.attrViewData)}`;
  if (outliers.length) text += `\nOutliers: ${outliers.sort(d3.ascending).join(',')}`;
  if (countNan) text += `\nNaN: ${countNan}`;

  container.append('svg:title')
    .text(text);
};

const commonOption = (titleL: string, titleM: string, mode : 'detail' | 'schema' = 'schema') => ({
  animation: false,
  grid: mode === 'schema' ? {
    left: '18%',
    height: '70%',
    top: '10%',
    right: '10%',
    bottom: '10%',
  } : {
    left: '10%',
    height: '75%',
    top: '15%',
    right: '10%',
    bottom: '20%',
  },
  title: mode === 'schema' ? { show: false } : {
    text: titleL,
    subtext: titleM,
    left: 'center',
    textStyle: {
      fontSize: 16,
    },
    subtextStyle: {
      rich: {
        i: {
          fontStyle: 'italic',
        },
      },
      width: '300',
      overflow: 'truncate',
    },
  },
});

export const generateBarOption = (
  info: attrViewDesc,
  mode: 'detail' | 'schema' = 'schema',
) => {
  const option = {
    ...commonOption(info.titleL || '', info.titleM || '', mode),
    tooltip: mode === 'schema' ? {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      position: (point: any, params: any, dom: any, rect: any, size: any) => {
        if (point[0] + size.contentSize[0] < size.viewSize[0]) {
          return [point[0] + 2, point[1] - 2];
        }
        return [(point[0] - size.contentSize[0]) < 0 ? 0 : point[0] - size.contentSize[0],
          point[1] - 2];
      },
      formatter(params: any) {
        return `${params[0].name}  <b>${params[0].value}</b>`;
      },
      extraCssText: 'height: 15px; padding: 0; padding-top: 6px; background: #4b4d53; border: none; border-radius: 0; color: #cfd1d4',
      textStyle: {
        fontSize: 1,
      },
    } : {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    color: ['#6baed6', '#4292c6', '#2171b5'],
    xAxis: {
      type: info.xAxisType,
      data: info.attrViewData[0],
      name: info.xTitle,
      nameTextStyle: {
        fontSize: mode === 'schema' ? 6 : 12,
        padding: mode === 'schema' ? [8, 0, 0, -20] : [16, 0, 0, -20],
        verticalAlign: 'top',
      },
      axisTick: {
        length: mode === 'schema' ? 2 : 4,
        alignWithLabel: true,
      },
      axisLabel: {
        margin: 2,
        hideOverlap: true,
        fontSize: mode === 'schema' ? 6 : 12,
      },
    },
    yAxis: {
      type: 'value',
      name: info.yTitle,
      nameTextStyle: {
        fontSize: mode === 'schema' ? 6 : 12,
        padding: mode === 'schema' ? [8, 0, -14, 0] : [0, 0, -6, 0],
      },
      minInterval: 1,
      axisTick: {
        length: mode === 'schema' ? 2 : 4,
      },
      axisLabel: {
        margin: 2,
        fontSize: mode === 'schema' ? 6 : 12,
      },
    },
    series: [
      {
        type: 'bar',
        data: info.attrViewData[1],
        barMaxWidth: mode === 'schema' ? '8px' : '16px',
      },
    ],
  };
  return option;
};

export const generateHeatMapOption = (
  info: attrViewDesc,
  mode: 'detail' | 'schema' = 'schema',
) => {
  const option = {
    ...commonOption(info.titleL || '', info.titleM || '', mode),
    tooltip: mode === 'schema' ? {
      show: false,
    } : {
      position: 'top',
    },
    xAxis: {
      type: 'category',
      data: info.hs,
      splitArea: {
        show: true,
      },
      name: info.xTitle,
      nameTextStyle: {
        fontSize: mode === 'schema' ? 6 : 12,
        padding: mode === 'schema' ? [7, 0, 0, -33] : [16, 0, 0, -33],
        verticalAlign: 'top',
      },
      axisTick: {
        length: mode === 'schema' ? 2 : 4,
      },
      axisLabel: {
        margin: 1,
        interval: 0,
        fontSize: mode === 'schema' ? 6 : 12,
      },
    },
    yAxis: {
      type: 'category',
      data: info.vs,
      splitArea: {
        show: true,
      },
      name: info.yTitle,
      nameTextStyle: {
        fontSize: mode === 'schema' ? 6 : 14,
        padding: mode === 'schema' ? [0, -8, -14, 0] : [0, -8, -10, 0],
      },
      axisTick: {
        length: mode === 'schema' ? 2 : 4,
      },
      axisLabel: {
        margin: 1,
        fontSize: mode === 'schema' ? 6 : 12,
      },
    },
    visualMap: {
      show: false,
      inRange: {
        color: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
      },
    },
    series: [
      {
        name: info.yTitle,
        type: 'heatmap',
        data: info.attrViewData,
        label: {
          show: true,
          fontSize: mode === 'schema' ? 8 : 12,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 2,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
  return option;
};

export const generatePieOption = (
  info: attrViewDesc,
  mode: 'detail' | 'schema' = 'schema',
) => {
  const option = {
    tooltip: mode === 'schema' ? {
      trigger: 'item',
      axisPointer: {
        type: 'shadow',
      },
      position: (point: any, params: any, dom: any, rect: any, size: any) => {
        if (point[0] + size.contentSize[0] < size.viewSize[0]) {
          return [point[0] + 2, point[1] - 2];
        }
        return [(point[0] - size.contentSize[0]) < 0 ? 0 : point[0] - size.contentSize[0],
          point[1] - 2];
      },
      formatter(params: any) {
        return `${params.name}  <b>${params.value}</b>`;
      },
      extraCssText: 'height: 15px; padding: 0; padding-top: 6px; background: #4b4d53; border: none; border-radius: 0; color: #cfd1d4',
      textStyle: {
        fontSize: 1,
      },
    } : {
      trigger: 'item',
    },
    title: {
      text: info.xTitle,
      left: 'center',
      textStyle: {
        fontSize: mode === 'schema' ? 6 : 16,
      },
    },
    color: ['#4292c6', '#2171b5'],
    series: [
      {
        type: 'pie',
        radius: '50%',
        data: info.attrViewData,
        emphasis: {
          itemStyle: {
            shadowBlur: 2,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        labelLine: {
          show: false,
        },
      },
    ],
  };
  return option;
};

export const generateFreqHistoOption = (
  info: attrViewDesc,
  mode: 'detail' | 'schema' = 'schema',
) => {
  const data = info.attrViewData;
  const dmin = d3.min(data);
  const dmax = d3.max(data);
  const interval = dmax - dmin;
  let mappingData = null;
  if (interval <= 8) {
    const binGen = d3.bin().domain([dmin - 1, dmax + 1]).thresholds(interval < 3 ? 3 : interval);
    const bins = binGen(data);
    mappingData = bins.map((bin: any) => [bin.x0, bin.x1, bin.length]);
  } else {
    const bins = ecStat.histogram(data, 'squareRoot');
    mappingData = echarts.util.map(bins.data, (item: any, index: any) => {
      // 左刻度
      const { x0 } = bins.bins[index];
      // 右刻度
      const { x1 } = bins.bins[index];
      // item[0]代表刻度的中间值，item[1]代表出现的次数
      return [x0, x1, item[1]];
    });
  }
  // 自定义渲染效果
  function renderItem(params: any, api: any) {
    // 这个根据自己的需求适当调节
    const yValue = api.value(2);
    const start = api.coord([api.value(0), yValue]);
    const size = api.size([api.value(1) - api.value(0), yValue]);
    const style = api.style();

    return {
      // 矩形及配置
      type: 'rect',
      shape: {
        x: start[0] + 1,
        y: start[1],
        width: mode === 'schema' ? Math.max(size[0] - 2, 2) : size[0] - 2,
        height: size[1],
      },
      style,
    };
  }
  const option = {
    ...commonOption(info.titleL || '', info.titleM || '', mode),
    tooltip: mode === 'schema' ? {
      trigger: 'item',
      axisPointer: {
        type: 'shadow',
      },
      position: (point: any, params: any, dom: any, rect: any, size: any) => {
        let tmpX = 0;
        let tmpY = 0;
        if (point[0] + size.contentSize[0] < size.viewSize[0]) {
          tmpX = point[0] + 2;
        } else {
          tmpX = (point[0] - size.contentSize[0]) < 0 ? 0 : point[0] - size.contentSize[0];
        }
        if (point[1] + size.contentSize[1] > size.viewSize[1]) {
          tmpY = (point[1] - size.contentSize[1]) < 0 ? 0 : point[1] - size.contentSize[1];
        } else {
          tmpY = point[1] - 2;
        }

        return [tmpX, tmpY];
      },
      formatter(params: any) {
        const tmpD = data.filter((num) => (num >= params.data[0] && num < params.data[1]));
        const df = new Map();
        tmpD.forEach((item) => df.set(item, (df.get(item) || 0) + 1));
        const specificData = Array.from(df).reduce((a, b) => `${a} <div style="padding-bottom: 6px">${b[0]} <b>${b[1]}</b></div><br/>`, '');
        return specificData;
      },
      extraCssText: 'padding: 0; padding-top: 6px; background: #4b4d53; border: none; border-radius: 0; color: #cfd1d4; overflow: hidden',
      textStyle: {
        fontSize: 1,
      },
    } : {
      trigger: 'item',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => `${params.seriesName}<br>[${params.data[0]}, ${params.data[1]}): <b>${params.data[2]}</b>`,
    },
    color: ['#6baed6', '#4292c6', '#2171b5'],
    xAxis: [{
      type: 'value',
      minInterval: 1, // 不要出现小数刻度
      name: info.xTitle,
      scale: true,
      nameTextStyle: {
        fontSize: mode === 'schema' ? 6 : 12,
        padding: mode === 'schema' ? [8, 0, 0, -26] : [16, 0, 0, -20],
        verticalAlign: 'top',
      },
      axisTick: {
        length: mode === 'schema' ? 2 : 4,
      },
      axisLabel: {
        margin: 2,
        fontSize: mode === 'schema' ? 6 : 12,
        hideOverlap: true,
      },
      alignTicks: true,
      splitLine: {
        show: false,
      },
    }],
    yAxis: [{
      type: 'value',
      name: info.yTitle,
      nameTextStyle: {
        fontSize: mode === 'schema' ? 6 : 12,
        padding: mode === 'schema' ? [0, 0, -14, 0] : [0, 0, -6, 0],
      },
      minInterval: 1,
      axisTick: {
        length: mode === 'schema' ? 2 : 4,
      },
      axisLabel: {
        margin: 2,
        fontSize: mode === 'schema' ? 6 : 12,
      },
      splitLine: {
        show: false,
      },
    }],
    series: [{
      name: 'Frequency',
      type: 'custom',
      renderItem,
      label: {
        show: false,
      },
      encode: {
        // 表示将data中的data[0]和data[1]映射到x轴
        x: [0, 1],
        // 表示将data中的data[2]映射到y轴
        y: 2,
        // 表示将data中的data[2]映射到tooltip
        tooltip: [0, 1, 2],
        // 表示将data中的data[2]映射到label
        label: 2,
      },
      data: mappingData,
    }],
  };
  return option;
};

// categoryFrequency Bar Chart
// String length Frequency Histogram
export const dataPrepForStr = (info: any, mode :'schema' | 'detail' = 'schema') => {
  const sf = new Map();
  info.data.forEach((s: string) => { sf.set(s, (sf.get(s) || 0) + 1); });
  const xseries: Array<string> = [];
  const yseries: Array<number> = [];
  sf.forEach((f: number, s: string) => {
    // 字符串需要fitting一下
    xseries.push(mode === 'schema' ? `${s}`.slice(0, 4) : `${s}`);
    yseries.push(f);
  });
  const categoryFrequencyData = {
    attrViewData: [xseries, yseries],
    xTitle: 'Str',
    yTitle: 'Freq',
    xAxisType: 'category',
    titleL: 'Category Frequency',
    titleM: `in node {i|${info.headInfo}}`,
  };

  const strLengthFrequency = {
    attrViewData: info.data.map((s: string) => s.length),
    xTitle: 'StrLen',
    yTitle: 'Freq',
    xAxisType: 'value',
    titleL: 'String Length Frequency',
    titleM: `in node {i|${info.headInfo}}`,
  };
  return {
    categoryFrequencyData,
    strLengthFrequency,
    sfsz: sf.size,
  };
};

const chartForStr = (
  element: any,
  info: any,
  selector: string,
) => {
  const { strLengthFrequency, categoryFrequencyData, sfsz } = dataPrepForStr(info);
  let flag = sfsz < 20;
  const realChart = echarts.init(element);

  const handleFilpClick = () => {
    realChart.clear();
    if (flag) {
      realChart.setOption(generateFreqHistoOption(strLengthFrequency));
    } else {
      realChart.setOption(generateBarOption(categoryFrequencyData));
    }
    flag = !flag;
  };

  const icon = document.createElement('span');
  icon.setAttribute('class', 'attrview-wrapper-icon');
  icon.addEventListener('click', handleFilpClick);

  element.appendChild(icon);

  realChart.clear();
  realChart.setOption(flag
    ? generateBarOption(categoryFrequencyData)
    : generateFreqHistoOption(strLengthFrequency));
};

// Box Plot
// Histogram for bin frequency
export const dataPrepForNum = (info: any) => {
  const sz = info.data.length;
  // 将原始数据转set，如果发现前后长度相差超过阈值 就用bar（freq histo），否则用box
  const removDup = new Set(info.data);
  const boxPlotData = {
    attrViewData: [...info.data],
  };
  const freqHistoData = {
    attrViewData: [...info.data],
    xTitle: 'Num',
    yTitle: 'Freq',
    xAxisType: 'value',
    titleL: 'Frequency Histogram',
    titleM: `in node {i|${info.headInfo}}`,
  };

  return {
    initFlag: sz - removDup.size < sz / 5,
    boxPlotData,
    freqHistoData,
  };
};

const chartForNum = (
  element: any,
  info: any,
  selector: string,
) => {
  const { boxPlotData, freqHistoData, initFlag } = dataPrepForNum(info);
  let flag = initFlag;

  const handleFilpClick = () => {
    if (flag) {
      element.removeChild(element.lastChild);
      const realChart = echarts.init(element);
      realChart.setOption(generateFreqHistoOption(freqHistoData));
    } else {
      echarts.dispose(element);
      // 总是先放icon，因为移除的时候是remove lastChild
      const icon = document.createElement('span');
      icon.setAttribute('class', 'attrview-wrapper-icon');
      icon.addEventListener('click', handleFilpClick);
      element.appendChild(icon);

      const svgElement = createSVGElement();
      element.appendChild(svgElement);
      drawBox(`g${selector} svg`, boxPlotData);
    }
    flag = !flag;
  };

  // 初始化的逻辑
  const icon = document.createElement('span');
  icon.setAttribute('class', 'attrview-wrapper-icon');
  icon.addEventListener('click', handleFilpClick);
  element.appendChild(icon);

  if (flag) {
    const svgElement = createSVGElement();
    element.appendChild(svgElement);
    drawBox(`g${selector} svg`, boxPlotData);
  } else {
    echarts.dispose(element);
    const realChart = echarts.init(element);
    realChart.clear();
    realChart.setOption(generateFreqHistoOption(freqHistoData));
  }
};

// pieChart

export const dataPrepForBool = (info: any) => {
  // 处理传入的info.data
  let cntF = 0;
  let cntT = 0;
  info.data.forEach((b: boolean) => {
    if (b) cntT += 1;
    else cntF += 1;
  });
  const attrViewData = [
    {
      value: cntT,
      name: 'True',
    },
    {
      value: cntF,
      name: 'False',
    },
  ];
  const xTitle = 'Bool Count';
  const boolData = {
    xTitle,
    attrViewData,
    titleL: 'Pie Chart For Bool',
    titleM: `in node {i|${info.headInfo}}`,
  };

  return { boolData };
};

const chartForBool = (
  element: any,
  info: any,
  selector: string,
) => {
  const { boolData } = dataPrepForBool(info);
  const option = generatePieOption(boolData);
  const realChart = echarts.init(element);
  realChart.clear();
  realChart.setOption(option);
};

export const dataPrepForComplex = (info: any) => {
  const xTitle = info.dataType === typeShortMapFull.a ? 'EleNum' : 'Keynum';
  const yTitle = 'MaxDepth';
  const KHMap = new Map();
  info.data.forEach((p: Array<number>) => {
    KHMap.set(`${p[0]},${p[1]}`, (KHMap.get(`${p[0]},${p[1]}`) || 0) + 1);
  });
  const attrViewData: Array<any> = [];
  KHMap.forEach((v: number, k: string) => {
    attrViewData.push([...k.split(','), v]);
  });

  const hs = Array.from(new Set([...attrViewData.map((d: any) => parseInt(d[0], 10))]))
    .sort((a: number, b: number) => a - b);
  const vs = Array.from(new Set([...attrViewData.map((d: any) => parseInt(d[1], 10))]))
    .sort((a: number, b: number) => a - b);
  const complexData = {
    xTitle,
    yTitle,
    attrViewData,
    hs,
    vs,
    titleL: 'Heat Map',
    titleM: `in node {i|${info.headInfo ? info.headInfo.split('#;').join(',') : ''}}`,
  };
  return { complexData };
};

const chartForComplex = (
  element: HTMLElement,
  info: {dataType: typeShortMapFull, data: any},
  selector: string,
) => {
  const { complexData } = dataPrepForComplex(info);
  // 生成option
  const option = generateHeatMapOption(complexData);
  const realChart = echarts.init(element);
  realChart.clear();
  realChart.setOption(option);
};

const chartForNull = (
  element: HTMLElement,
  info: {dataType: typeShortMapFull, data: any},
  selector: string,
) => {
  // 只是就一根柱子
  const nullData = {
    attrViewData: [['Null'], [info.data.length]],
    xTitle: '',
    yTitle: 'Freq',
    xAxisType: 'category',
    titleL: 'Bar Chart',
    titleM: 'in node of type {i|Null}',
  };
  const option = generateBarOption(nullData);
  const realChart = echarts.init(element);
  realChart.clear();
  realChart.setOption(option);
};

export const chartForType = {
  [typeShortMapFull.s]: chartForStr,
  [typeShortMapFull.n]: chartForNum,
  [typeShortMapFull.b]: chartForBool,
  [typeShortMapFull.a]: chartForComplex,
  [typeShortMapFull.d]: chartForComplex,
  [typeShortMapFull.e]: chartForNull,
};

export const detailPieOption = ({
  titleL,
  titleM,
  viewData,
}: any) => {
  const option = {
    ...commonOption(titleL, titleM, 'detail'),
    color: ['#6baed6'],
    title: {
      text: titleL,
      subtext: titleM,
      left: 'center',
      textStyle: {
        fontSize: 18,
      },
      subtextStyle: {
        rich: {
          i: {
            fontStyle: 'italic',
          },
        },
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => (`${params.name}: ${params.value} (${params.percent}%)`),
    },
    series: [
      {
        type: 'pie',
        radius: ['20%', '60%'],
        data: viewData,
        itemStyle: {
          borderRadius: 10,
          borderWidth: 4,
          borderColor: '#fffdfa',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
        top: '10%',
        labelLine: {
          length: 6,
        },
      },
    ],
  };

  return option;
};

export const detailBoxOption = ({
  titleL,
  titleM,
  viewData,
}: any) => {
  const option = {
    ...commonOption(titleL, titleM, 'detail'),
    dataset: [
      {
        source: [viewData.map((item: any) => item.value)],
      },
      {
        transform: {
          type: 'boxplot',
          config: {},
        },
      },
      {
        fromDatasetIndex: 1,
        fromTransformResult: 1,
      },
    ],
    tooltip: {
      trigger: 'item',
      axisPointer: {
        type: 'shadow',
      },
    },
    grid: {
      left: '15%',
      right: '15%',
      bottom: '10%',
    },
    xAxis: {
      type: 'category',
    },
    yAxis: {
      type: 'value',
      splitArea: {
        show: true,
      },
    },
    series: [
      {
        type: 'boxplot',
        datasetIndex: 1,
        tooltip: { // 以下是设置tooltip的显示数据和显示格式
          formatter(param: any) {
            return [
              `Max: ${param.data[5]}`,
              `First Quartile: ${param.data[4]}`,
              `Median: ${param.data[3]}`,
              `Third Quartile: ${param.data[2]}`,
              `Min: ${param.data[1]}`,
            ].join('<br/>');
          },
        },
        top: '10%',
      },
    ],
  };
  return option;
};
