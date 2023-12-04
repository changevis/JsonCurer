<template>
  <el-row
    v-for="(item, index) in formData"
    :key="index"
  >
    <el-col :span="3">
      <span class="label-style">Change</span>
    </el-col>
    <el-col :span="7">
      <el-select
        v-model="item.from"
        allow-create
        default-first-option
      >
      <el-option
        v-for="(item) in toSelect"
        :key="item"
        :value="item"
        :label="item"
      >
      </el-option>
      </el-select>
    </el-col>
    <el-col :span="2">
      <span class="label-style">to</span>
    </el-col>
    <el-col :span="7">
      <el-input
        v-model="item.to"
      ></el-input>
    </el-col>
    <el-col :span="2" style="display: table">
      <span
        v-if="index === 0"
        @click="addItem"
        @keydown="addItem"
        class="icon-style"
      >
      <plus-circle-outlined />
      </span>
      <span v-else
        @click="deleteItem(index)"
        @keydown="deleteItem(index)"
        class="icon-style"
      >
        <minus-circle-outlined />
      </span>
    </el-col>
  </el-row>
</template>
<script lang="ts">
import {
  defineComponent,
  reactive,
  watch,
  onMounted,
} from 'vue';
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons-vue';
import { debounce } from 'lodash';
import { useStore } from '@/store';

export default defineComponent({
  emits: ['paramChange'],
  components: {
    MinusCircleOutlined,
    PlusCircleOutlined,
  },
  setup(_, { emit }) {
    const formData = reactive([{ from: '', to: '' }]);

    const store = useStore();
    const nodeId = store.getters.getCurrentIssueIds[0]; // iconsisitent value只关注一个节点
    const toSelect = Array.from(new Set(store.state.flattenedNode[nodeId].data
      .reduce((a: any, b: any) => [...a, ...b], [])));

    watch(formData, debounce(() => {
      emit('paramChange', JSON.stringify(formData));
    }, 1000));
    onMounted(() => {
      emit('paramChange', JSON.stringify(formData));
    });

    const addItem = () => {
      formData.push({
        from: '',
        to: '',
      });
    };

    const deleteItem = (index: number) => {
      formData.splice(index, 1);
    };

    return {
      formData,
      addItem,
      deleteItem,
      toSelect,
    };
  },
});
</script>

<style scoped>
@import url(@/components/cleansingSubComponent/form-style.less);

.icon-style{
  display: table-cell;
  vertical-align: middle;
  text-align: center;
}
</style>
