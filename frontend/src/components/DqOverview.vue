<template>
  <div class="issue-summary">
    <div class="type-chart"></div>
    <div class="KVS-chart"></div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent, watch, ref,
} from 'vue';
import { useStore } from '@/store';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
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

echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  BarChart,
  LabelLayout,
  UniversalTransition,
  SVGRenderer,
  LegendComponent,
]);

export default defineComponent({
  setup() {
    const store = useStore();
    const typeChart = ref();
    const KVSChart = ref();

    const initTypeChart = () => {
      const typecontainer = document.querySelector('.type-chart') as HTMLElement;
      echarts.dispose(typecontainer); // 每一次都销毁
      typeChart.value = echarts.init(typecontainer);

      const { piedataWithInfo, accordingColor } = store.getters.categoryInfo;

      const option = {
        tooltip: {
          show: true,
          formatter: (params: any) => (`${params.name}: ${params.value} (${params.percent}%)`),
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          textStyle: {
            fontSize: 15,
          },
        },
        color: accordingColor,
        series: [
          {
            name: 'Issue',
            type: 'pie',
            avoidLabelOverlap: false,
            radius: '55%',
            center: ['74%', '52%'],
            data: piedataWithInfo,
            labelLine: false,
            label: false,
          },
        ],
      };

      typeChart.value.on('legendselectchanged', (params: any) => {
        const inactiveCategoryIndex: Array<number> = [];
        Object.values(params.selected)
          .forEach((value, index: number) => {
            if (!value) {
              inactiveCategoryIndex.push(index);
            }
          });
        store.commit('setMutedCategory', inactiveCategoryIndex);
      });
      typeChart.value.setOption(option);
    };

    const initKVSChart = () => {
      const kvscontainer = document.querySelector('.KVS-chart') as HTMLElement;
      echarts.dispose(kvscontainer); // 每一次都销毁
      KVSChart.value = echarts.init(kvscontainer);

      const formatLabel = (params: any) => {
        const a = params.data.value;
        return a > 0 ? a : '';
      };

      const { seriesName: ydata, stackInfo: xdata } = store.getters.KVInfo;
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
          },
        },
        legend: {
          show: false,
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '8%',
          top: '10%',
          containLabel: true,
        },
        xAxis: {
          type: 'value',
          boundaryGap: [0, 0.01],
          minInterval: 1,
          axisLabel: {
            fontSize: 15,
          },
        },
        yAxis: {
          type: 'category',
          data: ydata,
          axisLabel: {
            fontSize: 15,
          },
        },
        series: xdata.map((item: any) => (
          {
            name: item.stackName,
            type: 'bar',
            stack: 'total',
            label: {
              show: true,
              formatter: formatLabel,
              color: '#6e7078',
              fontSize: 16,
            },
            emphasis: {
              focus: 'series',
            },
            data: item.stackData,
          }
        )),
      };
      KVSChart.value.setOption(option);
    };

    watch(() => store.getters.categoryInfo, (cur) => {
      if (!typeChart.value) { // 首次加载渲染
        initTypeChart();
        return;
      }
      const { piedataWithInfo } = cur; // 后续更新
      typeChart.value.setOption({
        series: [{
          data: piedataWithInfo,
        }],
      });
    });

    watch(() => store.getters.KVInfo, (cur) => {
      if (!KVSChart.value) {
        initKVSChart();
        return;
      }
      const { stackInfo: xdata } = cur;
      KVSChart.value.setOption({
        series: xdata.map((item: any) => (
          {
            data: item.stackData,
          }
        )),
      });
    });
  },
});
</script>
<style scoped>

.issue-summary {
  display: flex;
  flex-flow: row;
  height: calc(100% - 28px);
}
.type-chart {
  width: 50%;
  height: 100%;
  margin: 3px;
}

.KVS-chart {
  width: 50%;
  height: 100%;
  margin: 3px;
}

</style>
