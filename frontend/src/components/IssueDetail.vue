<template>
  <div id="detail-charts">
    <div
      class="detail-wrapper"
      v-if="issueOptions.showDetail"
      >
        <div
        v-for="(_, i) in issueOptions.optionArray"
        :key="i"
        :class="`chart-container-${i} detail-chart`"
        :style='{width: blockWidth, height: blockHeight}'
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  onMounted,
  watch,
  computed,
  nextTick,
  ref,
} from 'vue';
import { useStore } from '@/store';
import * as echarts from 'echarts/core';
import { PieChart, BoxplotChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  LegendComponent,
} from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { SVGRenderer } from 'echarts/renderers';
import elementResizeDetectorMarker from 'element-resize-detector';

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  PieChart,
  LabelLayout,
  UniversalTransition,
  SVGRenderer,
  LegendComponent,
  BoxplotChart,
]);

export default defineComponent({
  setup() {
    const store = useStore();
    const erd = elementResizeDetectorMarker();
    const blockWidth = ref('300px');
    const blockHeight = ref('300px');

    const issueOptions = computed(() => store.getters.prepareSelectedIssue);

    const renderChart = () => {
      if (!store.getters.prepareSelectedIssue || !store.getters.prepareSelectedIssue.showDetail) {
        return;
      }
      nextTick(() => {
        issueOptions.value.optionArray.forEach((option: any, index: number) => {
          const chartDom = document.querySelector(`.chart-container-${index}`) as HTMLElement;
          echarts.dispose(chartDom);
          const detailChart = echarts.init(chartDom);
          detailChart.setOption(option);
        });
      });
    };
    watch(() => store.getters.prepareSelectedIssue, renderChart);

    const calcHeight = () => {
      const wrapperBox = document.getElementById('detail-charts');
      if (!wrapperBox) return;
      erd.listenTo(wrapperBox, (element: HTMLElement) => {
        const detailWrapper = document.querySelector('.detail-wrapper') as HTMLElement;
        if (!detailWrapper) return;
        detailWrapper.style.height = `${element.offsetHeight}px`;
      });
    };

    onMounted(() => {
      calcHeight();
      const wrapperBox = document.getElementById('detail-charts');
      if (!wrapperBox) return;
      blockWidth.value = `${wrapperBox.offsetWidth - 10}px`; // 预留一些空间给tooltip
      blockHeight.value = `${wrapperBox.offsetWidth - 20}px`;
      renderChart();
    });
    return {
      issueOptions,
      blockWidth,
      blockHeight,
    };
  },
});
</script>

<style lang="less" scoped>
#detail-charts {
  width: 100%;
  height: calc(100% - 22px);
}

.detail-wrapper {
  overflow: hidden;

  &:hover {
    overflow-y: scroll;
    &::-webkit-scrollbar {
    height: 6px;
    width: 6px;
  }

    &::-webkit-scrollbar-thumb {
      background: rgb(199,200,201);
      border-radius: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 5px;
    }
  }
}

.detail-chart {
  width: 300px;
  height: 300px;
};
</style>
