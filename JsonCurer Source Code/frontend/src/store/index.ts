import { createStore, Store, useStore as baseUseStore } from 'vuex';
import { InjectionKey, toRaw } from 'vue';
import {
  generalTypes,
  specificIssueTypes,
  IssueByKVS,
  undetectedIssueTypes,
  IssueBySixCategory,
  selectedNodeInfo,
  customIssue,
  mapToComponent,
  generalIssueTypes,
  nodeBubbleDesc,
} from '@/utils/types';
import {
  uploadJSONFile,
  getCaseData,
  simChange,
  preview,
  showDecoration,
} from '@/utils/api';
import {
  checkShouldAble,
  curateFormData,
  generateDescription,
  doBubbles,
} from '@/utils/util';
import {
  attributeViewStyle,
  OverviewLegendFill,
  typeNodeStyle,
} from '@/utils/style';
import {
  dataPrepForBool,
  dataPrepForComplex,
  dataPrepForStr,
  dataPrepForNum,
  generateFreqHistoOption,
  generateBarOption,
  generatePieOption,
  generateHeatMapOption,
  detailPieOption,
  detailBoxOption,
} from '@/utils/basicChart';

// define your typings for the store state
export interface issueSpec {
  type: generalTypes,
  count: number,
  details: Array<specificIssueTypes | undetectedIssueTypes>,
  locations: Array<Array<Array<number>>>
  description: Array<Array<Array<string>>>
  representation: Array<Array<any>>
}
export interface State {
  jsonData: string,
  jsonSchema: string,
  issues: Array<issueSpec>,
  showAttr: boolean,
  dictSim: number,
  arrSim: number,
  selectedIssue: string, // x-x-x形如
  dismissedIssues: Array<string>,
  contextMenuVisible: boolean,
  selectedNode: Array<selectedNodeInfo>,
  editorDiffOn: boolean,
  editorDiffValue: string,
  transformationDesc: string,
  log: Array<string>,
  flattenedNode: Array<any>, // 树中所有节点的位置与数据信息
  mutedCategory: Array<number>,
  visibileNode: Array<any>, // 树中所有展开的节点的位置信息，与树的update函数同步
  editorDecorationOn: boolean,
  editorDecorationValue: string,
  loading: boolean,
  treeInitialRender: boolean,
  shift: boolean,
  zoomToCenter: boolean,
  batchIssue: Array<string>,
}
export interface pieceIssue {
  generalType: generalTypes,
  specificIssue: specificIssueTypes | undetectedIssueTypes,
  location: Array<Array<number>>,
}

export interface cliqueInfo {
  generalType: generalTypes,
  specificIssue: specificIssueTypes | undetectedIssueTypes,
  location: Array<number>,
  description: string,
  aidx: number,
  bidx: number,
  cidx: number,
}

export interface issueNode {
  id: string,
  label: string,
  children?: Array<issueNode>,
}

// define injection key
// eslint-disable-next-line symbol-description
export const key: InjectionKey<Store<State>> = Symbol();

// 创建一个新的 store 实例
export const store = createStore<State>({
  state() {
    return {
      jsonData: '',
      jsonSchema: '',
      issues: [],
      showAttr: true,
      dictSim: 0.5,
      arrSim: 0.5,
      selectedIssue: '0-0-0',
      dismissedIssues: [],
      contextMenuVisible: false,
      selectedNode: [],
      editorDiffOn: false,
      editorDiffValue: '',
      transformationDesc: '',
      log: [],
      flattenedNode: [],
      mutedCategory: [],
      visibileNode: [],
      editorDecorationOn: false,
      editorDecorationValue: '',
      loading: false,
      treeInitialRender: true,
      shift: false,
      zoomToCenter: false,
      batchIssue: [],
    };
  },
  mutations: {
    updateJsonData(state: State, value: any) {
      state.jsonData = value;
    },
    updateSchema(state: State, value: any) {
      state.jsonSchema = value;
    },
    updateIssue(state: State, value: any) {
      state.issues = JSON.parse(value);
    },
    toggleShowAttr(state: State, value: boolean) {
      state.showAttr = value;
    },
    updateDictSim(state: State, value: number) {
      state.dictSim = value;
    },
    updateArrSim(state: State, value: number) {
      state.arrSim = value;
    },
    updateSelectedIssue(state: State, value: string) {
      state.selectedIssue = value;
    },
    addDismissedIssue(state: State, value: string) {
      state.dismissedIssues.push(value);
    },
    removeDismissedIssue(state: State, value: string) {
      state.dismissedIssues = state.dismissedIssues.filter((v: string) => v !== value);
    },
    setContextMenuVisibility(state: State, value: boolean) {
      state.contextMenuVisible = value;
    },
    addSelectedNode(state: State, value: any) {
      state.selectedNode.push(value);
    },
    removeSelectedNode(state: State, id: string) {
      state.selectedNode = state.selectedNode.filter((node: any) => node.id !== id);
    },
    addCustomIssue(state: State, cIssue: customIssue) {
      const idx = state.issues.findIndex((issue: issueSpec) => issue.type === cIssue.gType);
      if (idx === -1) return;
      const currentGT = state.issues[idx];
      currentGT.count += 1;
      const subIdx = currentGT.details.findIndex((t) => t === cIssue.sType);

      let idx2 = currentGT.details.length;
      let idx3 = 0;
      if (subIdx === -1) { // 当前大类下没有这个子类
        currentGT.details.push(cIssue.sType);
        currentGT.locations.push([cIssue.location]);
        currentGT.description.push([cIssue.description]);
        currentGT.representation.push([cIssue.representation]);
      } else {
        idx2 = subIdx;
        idx3 = currentGT.locations[subIdx].length;
        currentGT.locations[subIdx].push(cIssue.location);
        currentGT.description[subIdx].push(cIssue.description);
        currentGT.representation.push(cIssue.representation);
      }

      setTimeout(() => { // 宏任务在DOM渲染结束之后执行
        state.selectedIssue = `${idx}-${idx2}-${idx3}`;
      });
    },
    clearSelectedNode(state: State) {
      state.selectedNode = [];
    },
    updateDiffMode(state: State, { mode, diffContent }) {
      state.editorDiffOn = mode;
      state.editorDiffValue = diffContent;
    },
    addLog(state: State, value) {
      state.log.push(value);
    },
    setFlattenedNode(state: State, value) {
      state.flattenedNode = value;
    },
    setMutedCategory(state: State, value) {
      state.mutedCategory = value;
    },
    setVisibileNode(state: State, value) {
      state.visibileNode = value;
    },
    updateDecorationMode(state: State, { mode, decorationContent, shift }) {
      state.editorDecorationOn = mode;
      state.editorDecorationValue = decorationContent;
      state.shift = shift;
    },
    updateTransformationDesc(state: State, value) {
      state.transformationDesc = value;
    },
    setTreeInitialRender(state: State, value) {
      state.treeInitialRender = value;
    },
    setZoomToCenter(state: State, value) {
      state.zoomToCenter = value;
    },
    setBatchIssue(state: State, value) {
      state.batchIssue = value;
    },
  },
  actions: {
    async updateJson({ commit, state }, { formData, editorValue }) {
      commit('updateJsonData', editorValue);
      state.loading = true;
      const response = await uploadJSONFile({
        data: formData,
      });
      if (response.status === 200) {
        state.loading = false;
        const { specInfo, issueInfo } = response.data;
        commit('updateSchema', specInfo);
        commit('updateIssue', issueInfo);
      }
    },
    async updateCase({ state, commit }, param) {
      state.loading = true;
      const response = await getCaseData({
        data: {
          case: param.case,
          dictSim: state.dictSim,
          arrSim: state.arrSim,
        },
      });
      if (response.status === 200) {
        state.loading = false;
        const { dataInfo, specInfo, issueInfo } = response.data;
        commit('updateJsonData', dataInfo);
        commit('updateSchema', specInfo);
        commit('updateIssue', issueInfo);
      }
    },
    async updateSim({ state, commit }, param) {
      state.loading = true;
      const response = await simChange({
        data: {
          ...param,
          jsonData: state.jsonData,
        },
      });
      if (response.status === 200) {
        state.loading = false;
        const { specInfo, issueInfo } = response.data;
        commit('updateSchema', specInfo);
        commit('updateIssue', issueInfo);
      }
    },
    async transPreview({ state, commit, getters }, { issueType, parameters, modeDiff }) {
      let mode = 'single';
      if (store.state.batchIssue.length > 1) {
        mode = 'batch';
      }

      const formData = curateFormData(state.jsonData, state.dictSim, state.arrSim);
      // 当前issue的节点信息从store中拿，需要确定一下怎么定位节点
      formData.append('issueType', issueType);
      formData.append('parameters', parameters);
      formData.append('mode', mode);

      if (mode === 'single') {
        const { path, loc } = getters.getCurrentIssueLoc;
        formData.append('dataPath', path);
        // 传入schema tree中编号的位置，用来对应数据
        formData.append('nodeIds', JSON.stringify(loc));
      } else {
        // dataPath和currentLoc 是一个issueloc stringify之后的数组
        const dps:Array<string> = [];
        const locs: Array<string> = [];
        state.batchIssue.forEach((issueId) => {
          const [i, j, k] = issueId.split('-')
            .map((id: string) => parseInt(id, 10));
          const currentLoc = state.issues[i].locations[j][k];
          const currentIssuePath = currentLoc.map(
            (nodeloc: number) => state.flattenedNode[nodeloc].dataPath,
          );
          dps.push(JSON.stringify(currentIssuePath));
          locs.push(JSON.stringify(currentLoc));
        });
        formData.append('dataPath', JSON.stringify(dps));
        // 传入schema tree中编号的位置，用来对应数据
        formData.append('nodeIds', JSON.stringify(locs));
      }

      const response = await preview({
        data: formData,
      });

      if (response.status === 200) {
        const { diffJson, targetDesc } = response.data;
        commit('updateTransformationDesc', targetDesc);
        commit('updateDiffMode', {
          mode: modeDiff,
          diffContent: diffJson,
        });
      }
    },
    async getDecoration({ state, commit }, [id, idx]) {
      const pathd = state.flattenedNode[id].dataPath[idx];

      const response = await showDecoration({
        data: {
          pathData: JSON.stringify(pathd),
          jsonData: state.jsonData,
        },
      });
      if (response.status === 200) {
        const { decorationContent, shiftFlag } = response.data;
        commit('updateDecorationMode', {
          mode: true,
          decorationContent,
          shift: shiftFlag,
        });
      }
    },
  },
  getters: {
    detailedIssue(state) { // 所有issues包括已经dismiss的
      const TreeIssues: Array<Array<issueNode>> = state.issues.map(
        (issue: issueSpec, i: number) => issue.details.map(
          (specificIssue: string, j: number) => (
            {
              label: specificIssue,
              id: specificIssue,
              children: issue.description[j].map((desc: Array<string>, k: number) => ({
                label: generateDescription(desc, specificIssue),
                id: `${i}-${j}-${k}`, // 用于定位representation
              })),
            }
          ),
        ),
      );
      return TreeIssues.reduce((a, b) => [...a, ...b], []);
    },
    activeIssue(state, getters) {
      const flattenTree = getters.detailedIssue;
      const filterOutDismissed: Array<issueNode> = [];

      flattenTree.forEach((node: issueNode) => {
        if (!node.children || !node.children.length) return;
        const filtered = node.children.filter(
          (c: issueNode) => !state.dismissedIssues.includes(c.id)
            && !state.mutedCategory.includes(parseInt(c.id[0], 10)),
        );
        if (!filtered.length) return;
        filterOutDismissed.push(
          {
            ...node,
            label: `${node.label}  (${filtered.length})`,
            children: filtered, // 覆盖原有children
          },
        );
      });
      if (filterOutDismissed.length > 0) {
        state.selectedIssue = filterOutDismissed[0].children![0].id;
      }
      return filterOutDismissed;
    },
    inactiveIssue(state, getters) {
      const flattenTree = getters.detailedIssue;
      const filterInDismissed: Array<issueNode> = [];

      flattenTree.forEach((node: issueNode) => {
        if (!node.children || !node.children.length) return;
        const filtered = node.children.filter(
          (c: issueNode) => state.dismissedIssues.includes(c.id),
        );
        if (!filtered.length) return;
        filterInDismissed.push(
          {
            ...node,
            label: `${node.label}  (${filtered.length})`,
            children: filtered, // 覆盖原有children
          },
        );
      });
      return filterInDismissed;
    },
    activeIssueCount(_, getters) {
      const child = getters.activeIssue.map(
        (issue: issueNode) => issue.children?.length || 0,
      );
      return child.reduce((a: number, b: number) => a + b, 0);
    },
    inactiveIssueCount(_, getters) {
      const child = getters.inactiveIssue.map(
        (issue: issueNode) => issue.children?.length || 0,
      );
      return child.reduce((a: number, b: number) => a + b, 0);
    },
    getCliqueData(state) {
      const issueWithLoc = state.issues.map((issue: issueSpec, i: number) => (
        issue.details.map((value: string, j: number) => (
          {
            generalType: issue.type,
            specificIssue: value,
            location: issue.locations[j],
            aidx: i,
            bidx: j,
          }
        ))
      ));
      const flattenedSpecific: any[] = issueWithLoc.reduce((a, b) => [...a, ...b], []);
      const flattenedLoc: Array<cliqueInfo> = [];
      flattenedSpecific.forEach((issue) => {
        issue.location.forEach((loc: Array<number>, k: number) => {
          flattenedLoc.push({
            ...issue,
            location: loc,
            cidx: k,
            description: `${issue.aidx}-${issue.bidx}-${k}`,
          });
        });
      });
      return flattenedLoc;
    },
    activeClique(state, getters) {
      const filtered = getters.getCliqueData.filter(
        (clique: cliqueInfo) => !state.dismissedIssues.includes(clique.description)
          && !state.mutedCategory.includes(clique.aidx),
      );
      // 排序，单个节点总是显示在最上层
      filtered.sort((a: cliqueInfo, b: cliqueInfo) => {
        const alen = a.location.length;
        const blen = b.location.length;
        if (alen < blen) {
          return 1;
        }
        if (alen > blen) {
          return -1;
        }
        return 0;
      });
      return filtered;
    },
    KVInfo(state, getters) {
      // 存储的应当是二维矩阵
      // row six category, col four KVS
      const matrix: Array<Array<number>> = new Array(6)
        .fill(0)
        .map(() => new Array(4)
          .fill(0));
      const data: Array<cliqueInfo> = getters.activeClique;
      const generalTypeMapRowIndex = [
        generalIssueTypes.consistency,
        generalIssueTypes.duplicate,
        generalIssueTypes.redundancy,
        generalIssueTypes.completeness,
        generalIssueTypes.accuracy,
        generalIssueTypes.schema,
      ];
      const seriesName: Array<string> = Array.from(Object.keys(IssueByKVS));
      seriesName.reverse();

      data.forEach(({ specificIssue, generalType }) => {
        let col = 0;
        (Object.keys(IssueByKVS) as Array<keyof typeof IssueByKVS>)
          .forEach((k) => {
            if (IssueByKVS[k].includes(specificIssue)) {
              col = seriesName.findIndex((s) => s === k);
            }
          });
        const row = generalTypeMapRowIndex.findIndex((item) => item === generalType);
        if (state.mutedCategory.includes(row)) {
          return;
        }
        matrix[row][col] += 1;
      });
      const stackInfo = generalTypeMapRowIndex
        .map((k, i) => ({
          stackName: k,
          stackData: matrix[i]
            .map((item: number) => ({
              value: item,
              itemStyle: { color: OverviewLegendFill[k] },
            })),
        }));

      return { seriesName, stackInfo };
    },
    categoryInfo(state) {
      const piedataWithInfo = state.issues.map((d: issueSpec, i: number) => {
        const filterOutDismissed = state.dismissedIssues.filter((item) => item.startsWith(`${i}`)).length;
        return {
          name: d.type,
          value: d.count - filterOutDismissed,
          details: d.details,
        };
      });
      const accordingColor = state.issues.map((d: issueSpec) => (OverviewLegendFill[d.type]));
      return {
        piedataWithInfo,
        accordingColor,
      };
    },
    prepareSelectedIssue(state) { // 此处应该直接返回echarts option，但是存在d3-boxplot的问题，暂时先不管
      const [i, j, k] = toRaw(state.selectedIssue)
        .split('-')
        .map((v: string) => parseInt(v, 10));
      if (!state.issues.length || !state.issues[i].count) return '';
      const source = state.issues[i].representation[j][k];

      if (!source) { // 如果当前没有任何数据
        return {
          showDetail: false,
        };
      }

      // 准备画图所需要的数据
      const optionArray: Array<any> = [];
      // 此处的viewData应当是后端传过来的对象
      // 如果是Array则说明是用户自行定义的issue的
      if (!Array.isArray(source)) {
        const viewData = Object.keys(source)
          .map((sk: string) => ({
            name: sk,
            value: source[sk],
          }));
        const config = {
          viewData,
          titleL: `${state.issues[i].details[j]}`,
          titleM: generateDescription(state.issues[i].description[j][k], state.issues[i].details[j], 'rich'),
        };
        if (specificIssueTypes.dataAssociations === state.issues[i].details[j]) {
          optionArray.push(detailBoxOption(config));
        } else {
          optionArray.push(detailPieOption(config));
        }
      }
      // 把attrView相关的数据搬过来
      const locs = state.issues[i].locations[j][k];
      locs.forEach((idx: number) => {
        const nodeInfo = state.flattenedNode[idx];
        nodeInfo.type.forEach((type: string, index: number) => {
          if (type === 'e') return; // null值没有可视化
          const info = {
            dataType: type,
            data: nodeInfo.data[index],
            headInfo: nodeInfo.key ? nodeInfo.key : 'Unamed Node',
          };
          switch (type) {
            case 'n': {
              const { freqHistoData } = dataPrepForNum(info);
              optionArray.push(generateFreqHistoOption(freqHistoData, 'detail'));
              break;
            }
            case 's': {
              const { strLengthFrequency, categoryFrequencyData } = dataPrepForStr(info, 'detail');
              optionArray.push(generateFreqHistoOption(strLengthFrequency, 'detail'));
              optionArray.push(generateBarOption(categoryFrequencyData, 'detail'));
              break;
            }
            case 'b': {
              const { boolData } = dataPrepForBool(info);
              optionArray.push(generatePieOption(boolData, 'detail'));
              break;
            }
            case 'a':
            case 'd': {
              const { complexData } = dataPrepForComplex(info);
              optionArray.push(generateHeatMapOption(complexData, 'detail'));
              break;
            }
            default: {
              break;
            }
          }
        });
      });

      return {
        showDetail: true,
        optionArray,
      };
    },
    abledContextMenu(state) {
      const menuList = Object.keys(IssueBySixCategory) as Array<keyof typeof IssueBySixCategory>;
      const selectedNodes = state.selectedNode;
      return menuList.map((item) => ({
        item,
        subItem: (IssueBySixCategory[item].map((issue: any) => {
          const disabled = checkShouldAble(selectedNodes, issue);
          return {
            issue,
            disabled,
          };
        })),
      }));
    },
    getCurrentIssueIndex(state) {
      return toRaw(state.selectedIssue)
        .split('-')
        .map((v: string) => parseInt(v, 10));
    },
    getCurrentIssue(state, getters) {
      const [i, j] = getters.getCurrentIssueIndex;
      if (!state.issues.length || !state.issues[i].count) return '';
      const currentIssue = state.issues[i].details[j];
      return currentIssue;
    },
    getCurrentForm(_, getters) {
      const issue: specificIssueTypes | undetectedIssueTypes | '' = getters.getCurrentIssue;
      if (issue === '') return '';
      return mapToComponent[issue];
    },
    getCurrentIssueLoc(state, getters) {
      const [i, j, k] = getters.getCurrentIssueIndex;
      if (!state.issues.length || !state.issues[i].count) {
        return {
          path: '',
          loc: '',
        };
      }
      const currentLoc = state.issues[i].locations[j][k];
      const currentIssuePath = currentLoc.map(
        (nodeloc: number) => state.flattenedNode[nodeloc].dataPath,
      );
      return {
        path: JSON.stringify(currentIssuePath),
        loc: JSON.stringify(currentLoc),
      };
    },
    getCurrentIssueDesc(state, getters) {
      const [i, j, k] = getters.getCurrentIssueIndex;
      if (!state.issues.length || !state.issues[i].count) return '';
      const desc = state.issues[i].description[j][k];
      return desc;
    },
    getCurrentIssueIds(state, getters) {
      const [i, j, k] = getters.getCurrentIssueIndex;
      if (!state.issues.length || !state.issues[i].count) return '';
      const ids = state.issues[i].locations[j][k];
      return ids;
    },
    generateBubbleData(state, getters) {
      // bubbleData的数据依赖于
      // 当前的activeClique，但是这些activeClqiue并不考虑节点的展开收起
      // visibleNode用于过滤已经收起的节点

      const existingNode = state.visibileNode;
      const cliqueData = getters.activeClique;
      const bubbleData: Array<nodeBubbleDesc> = [];

      existingNode.forEach((nodeInfo: any) => {
        const {
          x,
          y,
          id,
          data: {
            showAttr, // 当前是否展示attr
            attrs, // 获取当前有几张attrview
          },
        } = nodeInfo;
        bubbleData.push({
          id,
          x: x - typeNodeStyle.nodeWidth / 2,
          y: y + (showAttr && attrs.length ? -attributeViewStyle.height : 0)
          - typeNodeStyle.nodeHeight / 2,
          width: Math.max(attrs.length * attributeViewStyle.width, typeNodeStyle.nodeWidth),
          height: (showAttr && attrs.length ? attributeViewStyle.height : 0)
          + typeNodeStyle.nodeHeight,
        });
      });

      const pathData = cliqueData.map((clique: cliqueInfo) => {
        const cliqueIssueType = clique.generalType;
        const cliqueIssueName = `${clique.specificIssue.split(' ')
          .join('+')}`;
        const nodeInClqiue = bubbleData.filter(
          (d: nodeBubbleDesc) => clique.location.includes(parseInt(d.id, 10)),
        );
        const nodeNotInClique = bubbleData.filter(
          (d: nodeBubbleDesc) => !clique.location.includes(parseInt(d.id, 10)),
        );
        const pathd = doBubbles(nodeInClqiue, nodeNotInClique)
          .toString();
        return {
          pathd,
          cliqueIssueType,
          cliqueIssueName,
          issueId: clique.description,
        };
      });
      return pathData;
    },
    banButton(state) {
      if (!state.batchIssue.includes(state.selectedIssue)) {
        return true;
      }
      return false;
    },
  },
});

export function useStore() {
  return baseUseStore(key);
}
