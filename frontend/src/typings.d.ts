import * as d3s from 'd3-selection';

declare module 'd3-selection' {
  export interface Selection<
    GElement extends BaseType,
    Datum,
    PElement extends BaseType,
    PDatum
  > extends d3s.Selection{
    patternify(selectedTag: {tag: string, selector: string}):
    Selection<GElement, OldDatum, HTMLElement, any>;
  }
}
