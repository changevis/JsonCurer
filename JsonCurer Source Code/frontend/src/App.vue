<template>
  <router-view />
</template>

<style lang="less">
.clique-border {
  stroke: #2a4edb;
  stroke-width: 1px;
  stroke-opacity: 1;
}

.clique:not(.clique-border):hover {
  stroke: #95B1F1;
  stroke-width: 1px;
  stroke-opacity: 1;
}

.el-popper {
  max-width: 200px;
}

.full-rect {
  &.selected { // ui
    stroke: #2a4edb;
    stroke-opacity: 1;
    -webkit-filter: drop-shadow( 0px 0px 4px rgba(88, 159, 230, 0.2));
    filter: drop-shadow( 0px 0px 4px rgba(88, 164, 230, 0.2));
  }
}

// schema view的attribute view中的icon
.attrview-wrapper-icon {
  width: 6px;
  height: 6px;
  display: inline-block;
  background: url('@/assets/icons/switchAttrView.svg') no-repeat;
  background-size: 6px 6px;
  position: absolute;
  right: 1px;
  top: 1px;
  z-index: 2006;
  visibility: hidden;
}

.attrview:hover {
  .attrview-wrapper-icon {
    visibility: visible;
  }
}

.line-decoration {
  background: rgba(173, 216, 230, 0.5);
}

.text-hover:hover {
  fill: #2A4EDB;
}
</style>
