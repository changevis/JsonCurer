<template>
  <el-row>
    <el-col :span="6">
      <span class="label-style">Name for Key</span>
    </el-col>
    <el-col :span="16">
      <el-input v-model="formData.nameForKey"></el-input>
    </el-col>
  </el-row>
</template>

<script lang="ts">
import {
  defineComponent,
  onMounted,
  reactive,
  watch,
} from 'vue';

export default defineComponent({
  emits: ['paramChange'],
  setup(_, { emit }) {
    const formData = reactive({
      nameForKey: '',
    });

    watch(formData, () => {
      emit('paramChange', JSON.stringify(formData));
    });

    onMounted(() => {
      emit('paramChange', JSON.stringify(formData));
    });

    return {
      formData,
    };
  },
});
</script>

<style scoped>
@import url(@/components/cleansingSubComponent/form-style.less);
</style>
