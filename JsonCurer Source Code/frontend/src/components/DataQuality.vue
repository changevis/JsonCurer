<template>
  <div class="section-wrapper">
    <div class="section-header">
      <span class="head-text">
        Data Quality Management View
        <div class="head-banner"></div>
      </span>
    </div>
    <div class="sub-content">
      <div class="row" style="height:28%;">
        <div class="col">
          <div class="sub-header">
            <span>Issue Overview</span>
          </div>
          <dq-overview />
        </div>
      </div>
      <div class="row height-transition"
        :style='{height: `calc(72% - ${wrapperHeight})`}'
      >
        <div class="col">
          <div class="sub-header" style="border-right: 2px solid #90c1d760">
            <span>Potential Issue List</span>
          </div>
          <issue-list />
        </div>
        <div class="col">
          <div class="sub-header">
            <span>Details</span>
          </div>
          <issue-detail />
        </div>
      </div>
      <div class="row height-transition"
        :style="{ height: wrapperHeight}"
      >
        <div class="col">
          <div class="sub-header">
            Data Cleansing
          </div>
          <data-clean
          @heightChange="handleTransformHeightChange"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import DataClean from './DataClean.vue';
import DqOverview from './DqOverview.vue';
import IssueDetail from './IssueDetail.vue';
import IssueList from './IssueList.vue';

export default defineComponent({
  components: {
    DqOverview,
    IssueList,
    IssueDetail,
    DataClean,
  },
  setup() {
    const wrapperHeight = ref('0px');

    const handleTransformHeightChange = (value: number) => {
      wrapperHeight.value = `${value + 22}px`;
    };
    return {
      wrapperHeight,
      handleTransformHeightChange,
    };
  },
});
</script>

<style lang="less" scoped>
@import url('../utils/common-style.less');

.section-wrapper {
  .head-banner {
    width: 320px;
  }

  .section-header {
    box-shadow: none;
  }
}
.sub-content {
  display: flex;
  flex-flow: column;
  height: calc(100% - 24px);
}

.row{
  display: flex;
  flex-flow: row;
  .sub-header {
    height: 22px;
    line-height: 22px;
    font-size: 18px;
    padding-left: 2px;
    background-color: #90c1d738;
    font-weight: 500;
    color: #526068;
  }

  .col {
    flex: 1 1 0;
  }
}

.height-transition {
  overflow: hidden;
  -webkit-transition: height .5s ease;
  -moz-transition: height .5s ease;
  -o-transition: height .5s ease;
  transition: height .5s ease;
}
</style>
